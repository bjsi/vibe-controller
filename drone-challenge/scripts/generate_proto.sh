# curl -H "Authorization: Bearer XXX" -X GET challenge.helsing.codes:3000/challenge/drone/0 | jq -r '.content' > proto/drone.proto

python -m grpc_tools.protoc --proto_path=./proto ./proto/drone.proto --python_out=./src/drone_challenge/generated --grpc_python_out=./src/drone_challenge/generated

# Note, you need to edit the gprc file to use import generated.drone_pb2 as drone__pb2
# Betterprotos might fix this, see a VERY LONG thread about this issue here: https://github.com/protocolbuffers/protobuf/issues/1491