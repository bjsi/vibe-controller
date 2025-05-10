from generated.drone_pb2 import Point


def region_centre(region):
    """Return the centre of the region"""
    min_point = region.minimal_point
    max_point = region.maximal_point

    return Point(
        x=(min_point.x + max_point.x) / 2, y=(min_point.y + max_point.y) / 2, z=(min_point.z + max_point.z) / 2
    )


def speed(last_point, point):
    return Point(x=point.x - last_point.x, y=point.y - last_point.y, z=point.z - last_point.z)


def in_region(region, point):
    return (
        region.minimal_point.x < point.x < region.maximal_point.x
        and region.minimal_point.y < point.y < region.maximal_point.y
        and region.minimal_point.z < point.z < region.maximal_point.z
    )
