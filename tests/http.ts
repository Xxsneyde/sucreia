// HTTP real de Node y Express sobre un Duplex en memoria: sin puerto ni acceso de red.
import { createServer, type RequestListener } from 'node:http';
import { Duplex } from 'node:stream';
class MemorySocket extends Duplex {
  remoteAddress = '127.0.0.1';
  setTimeout() {
    return this;
  }
  setNoDelay() {
    return this;
  }
  setKeepAlive() {
    return this;
  }
  chunks: Buffer[] = [];
  _read() {}
  _write(chunk: Buffer, _encoding: string, done: () => void) {
    this.chunks.push(Buffer.from(chunk));
    done();
  }
}
export function httpClient(app: RequestListener) {
  const server = createServer(app);
  return async (
    method: string,
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
  ): Promise<Response> => {
    const payload = body === undefined ? '' : JSON.stringify(body),
      socket = new MemorySocket();
    const headers = {
      Host: 'localhost',
      Connection: 'close',
      ...(body === undefined
        ? {}
        : {
            'Content-Type': 'application/json',
            'Content-Length': String(Buffer.byteLength(payload)),
          }),
      ...extra,
    };
    const response = new Promise<Response>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('La API no respondió al HTTP en memoria.'));
      }, 5000);
      socket.on('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });
      socket.on('finish', () => {
        clearTimeout(timeout);
        try {
          const raw = Buffer.concat(socket.chunks),
            split = raw.indexOf('\r\n\r\n'),
            head = raw.subarray(0, split).toString().split('\r\n'),
            status = Number(head.shift()!.split(' ')[1]),
            responseHeaders = new Headers();
          for (const line of head) {
            const colon = line.indexOf(':');
            responseHeaders.append(line.slice(0, colon), line.slice(colon + 1).trim());
          }
          let data = raw.subarray(split + 4);
          if (responseHeaders.get('transfer-encoding') === 'chunked') {
            const chunks: Buffer[] = [];
            while (data.length) {
              const end = data.indexOf('\r\n'),
                size = parseInt(data.subarray(0, end).toString(), 16);
              if (!size) break;
              chunks.push(data.subarray(end + 2, end + 2 + size));
              data = data.subarray(end + 2 + size + 2);
            }
            data = Buffer.concat(chunks);
            responseHeaders.delete('transfer-encoding');
          }
          resolve(
            new Response(
              [204, 304].includes(status) || method === 'HEAD' ? null : new Uint8Array(data),
              { status, headers: responseHeaders },
            ),
          );
        } catch (e) {
          reject(e);
        } finally {
          socket.destroy();
        }
      });
    });
    server.emit('connection', socket);
    socket.push(
      `${method} ${path} HTTP/1.1\r\n${Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n')}\r\n\r\n${payload}`,
    );
    return response;
  };
}
