import queue
from enum import Enum
from time import sleep, time
import csv
import sys

import generated.drone_pb2 as pb2
import generated.drone_pb2_grpc as pb2_gprc
import grpc

class SimulationState(Enum):
    INIT = 0
    STARTED = 1
    ENDED = 3


class DroneClient:
    simulation_state = SimulationState.INIT
    last_update = None
    last_log_time = 0

    def __init__(self, host, port, token):
        # instantiate a channel
        self.channel = grpc.insecure_channel("{}:{}".format(host, port))

        # Create a queue for sending messages
        self.send_queue = queue.SimpleQueue()

        # bind the client and the server
        self.stub = pb2_gprc.DroneControllerStub(self.channel)

        # Bind send queue to sending service
        metadata = [("authorization", f"Bearer {token}")]
        self.event_stream = self.stub.DroneConnection(iter(self.send_queue.get, None), metadata=metadata)
        
        # Print CSV header
        print("timestamp,pos_x,pos_y,pos_z,error_x,error_y,error_z")

    def start(self):
        # Start the control loop etc
        self.control_loop()

    def control_drone(self):
        # Update the actual speed PIDs and get their output as the controls
        throttle = 100 if self.position.z < self.goal_region.maximal_point.z else 0
        pitch = 0
        roll = 0

        control = pb2.DroneClientMsg(
            throttle=throttle,
            pitch=pitch,
            roll=roll,
        )
        self.send_queue.put(control)

    def receive(self):
        return next(self.event_stream)

    def log_position_and_error(self):
        current_time = time()
        if current_time - self.last_log_time >= 1.0:  # Log every second
            error_x = self.goal_region.minimal_point.x - self.position.x
            error_y = self.goal_region.minimal_point.y - self.position.y
            error_z = self.goal_region.minimal_point.z - self.position.z
            
            print(f"{current_time:.3f},{self.position.x:.3f},{self.position.y:.3f},{self.position.z:.3f},{error_x:.3f},{error_y:.3f},{error_z:.3f}")
            self.last_log_time = current_time

    def control_loop(self):
        """Controls the drone until crash, success, or some other failure"""
        while self.simulation_state != SimulationState.ENDED:
            result = self.receive()

            if self.simulation_state == SimulationState.INIT:
                # Check if the first message is simulate start, and save the goal
                if result.WhichOneof("data") == "start":
                    self.goal_region = result.start.goal
                    self.position = result.start.drone_location
                    self.simulation_state = SimulationState.STARTED
                    continue
                else:
                    raise ValueError("Did not receive Simulation Start message as first message")

            # If we receive SimOver ("ended") - end
            if result.WhichOneof("data") == "ended":
                self.simulation_state = SimulationState.ENDED
                return

            # Update - pass into PID loop
            if result.WhichOneof("data") == "update":
                self.position = result.update.drone_location
                self.log_position_and_error()
                # Run PID loop
                self.control_drone()

if __name__ == "__main__":
    host = "172.237.101.153"
    port = 10301
    token = "blue.cardigan.1"
    dc = DroneClient(host, port, token)
    dc.start()
