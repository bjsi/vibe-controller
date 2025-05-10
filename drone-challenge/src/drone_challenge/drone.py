import queue
from enum import Enum
from time import sleep

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

    def start(self):
        # Start the control loop etc
        self.control_loop()

    def control_drone(self):
        print(f"Start of control_drone. Position: ", self.position.x, self.position.y, self.position.z)

        # Update the actual speed PIDs and get their output as the controls

        throttle = 100 if self.position.z < self.goal_region.maximal_point.z else 0
        pitch = 0
        roll = 0

        print("Requesting control input of:")
        print(f"{throttle=}")
        print(f"{pitch=}")
        print(f"{roll=}")

        control = pb2.DroneClientMsg(
            throttle=throttle,
            pitch=pitch,
            roll=roll,
        )
        self.send_queue.put(control)

    def receive(self):
        return next(self.event_stream)

    def control_loop(self):
        """Controls the drone until crash, success, or some other failure"""
        while self.simulation_state != SimulationState.ENDED:
            result = self.receive()

            if self.simulation_state == SimulationState.INIT:
                # Check if the first message is simulate start, and save the goal
                if result.WhichOneof("data") == "start":
                    self.goal_region = result.start.goal
                    
                    print("Goal region: ", self.goal_region)
                    self.position = result.start.drone_location

                    self.simulation_state = SimulationState.STARTED
                    continue
                else:
                    raise ValueError("Did not receive Simulation Start message as first message")

            # If we receive SimOver ("ended") - end
            if result.WhichOneof("data") == "ended":
                self.simulation_state = SimulationState.ENDED
                print("Simulation ended. Success: ", result.ended.success, " (", result.ended.details, ")")
                return

            # Update - pass into PID loop
            if result.WhichOneof("data") == "update":
                self.position = result.update.drone_location

                print(f"Position: ", self.position.x, self.position.y, self.position.z)

                # Run PID loop
                self.control_drone()

if __name__ == "__main__":
    host = "172.237.101.153"
    port = 10301
    token = "leeroy.jenkins"

    while True:
        dc = DroneClient(host, port, token)
        dc.start()
        sleep(20.0)
