"""Render Pyramid's simple vector mark as PNG app icons using only Python's standard library."""
import pathlib
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BLUE = (36, 94, 233)
GEMS = [(256,146,(228,248,255)),(198,239,(160,221,255)),(314,239,(209,239,255)),(140,332,(110,196,255)),(256,332,(160,221,255)),(372,332,(228,248,255))]

def chunk(name, payload):
    return struct.pack('!I', len(payload)) + name + payload + struct.pack('!I', zlib.crc32(name + payload) & 0xffffffff)

def render(size):
    pixels = bytearray()
    for row in range(size):
        pixels.append(0)
        for col in range(size):
            rgb = [0, 0, 0]
            # Four samples preserve clean, antialiased diamond edges at every size.
            for dx, dy in ((.25,.25),(.75,.25),(.25,.75),(.75,.75)):
                x, y = (col + dx) * 512 / size, (row + dy) * 512 / size
                color = BLUE
                for gx, gy, fill in GEMS:
                    if abs(x-gx)/46 + abs(y-gy)/56 <= 1:
                        color = fill
                        break
                for i in range(3):
                    rgb[i] += color[i]
            pixels.extend(round(component / 4) for component in rgb)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB',size,size,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(pixels,9)) + chunk(b'IEND',b'')
    (ROOT/'assets'/f'icon-{size}.png').write_bytes(png)

for size in (180, 192, 512):
    render(size)
print('Created 180, 192, and 512 pixel app icons.')
