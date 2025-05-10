# drone-challenge

Generate protobuf python bindings with `scripts/generate_proto.sh`. Manually add `generated` to module as there is a bug still in gRPC/protoc gen?

Create + activate venv with `slap venv ac`. Install dependencies with `slap install` or `poetry install`

Run with:
`python src/drone_challenge/drone.py`

## Hints

roll -45 to 45 throttle 0-100, battery simulation on the drone which impacts throttle, pitch is also -45 to 45 timesteps are every 100ms, probably need to send info constantly, wind simulation is randomly seeded each time