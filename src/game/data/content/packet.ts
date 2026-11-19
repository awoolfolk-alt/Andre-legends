export type TrainingPacket = {
  number: number;
  time: string;
  sourceMac: string;
  destinationMac: string;
  sourceIp: string;
  destinationIp: string;
  ttl: number;
  protocol: "TCP" | "UDP" | "ICMP";
  sourcePort?: number;
  destinationPort?: number;
  flags?: string;
  length: number;
  frameLength: number;
  dnsQuery?: string;
  httpMethod?: string;
  httpHost?: string;
  payload: string;
};

const CLIENT = "192.0.2.10";
const SERVER = "203.0.113.8";

export const TRAINING_CAPTURE: TrainingPacket[] = [
  { number: 1, time: "0.000000", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:53", sourceIp: CLIENT, destinationIp: "198.51.100.53", ttl: 64, protocol: "UDP", sourcePort: 53000, destinationPort: 53, length: 42, frameLength: 60, dnsQuery: "training.example", payload: "DNS query training.example" },
  { number: 2, time: "0.011204", sourceMac: "02:00:00:00:00:53", destinationMac: "02:00:00:00:00:10", sourceIp: "198.51.100.53", destinationIp: CLIENT, ttl: 55, protocol: "UDP", sourcePort: 53, destinationPort: 53000, length: 58, frameLength: 76, dnsQuery: "training.example", payload: "DNS answer 203.0.113.8" },
  { number: 3, time: "0.044901", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51000, destinationPort: 80, flags: "S", length: 40, frameLength: 58, payload: "SYN" },
  { number: 4, time: "0.061002", sourceMac: "02:00:00:00:00:08", destinationMac: "02:00:00:00:00:10", sourceIp: SERVER, destinationIp: CLIENT, ttl: 58, protocol: "TCP", sourcePort: 80, destinationPort: 51000, flags: "S.", length: 40, frameLength: 58, payload: "SYN ACK" },
  { number: 5, time: "0.061181", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51000, destinationPort: 80, flags: ".", length: 32, frameLength: 50, payload: "ACK" },
  { number: 6, time: "0.080000", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51000, destinationPort: 80, flags: "P.", length: 74, frameLength: 92, httpMethod: "GET", httpHost: "training.example", payload: "GET /status HTTP/1.1 Host: training.example" },
  { number: 7, time: "0.103421", sourceMac: "02:00:00:00:00:08", destinationMac: "02:00:00:00:00:10", sourceIp: SERVER, destinationIp: CLIENT, ttl: 58, protocol: "TCP", sourcePort: 80, destinationPort: 51000, flags: "P.", length: 60, frameLength: 78, payload: "HTTP/1.1 200 OK" },
  { number: 8, time: "0.145020", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:20", sourceIp: CLIENT, destinationIp: "198.51.100.20", ttl: 64, protocol: "ICMP", length: 56, frameLength: 74, payload: "Echo request" },
  { number: 9, time: "0.212215", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51100, destinationPort: 443, flags: "S", length: 40, frameLength: 58, payload: "TLS Client Hello" },
  { number: 10, time: "0.244101", sourceMac: "02:00:00:00:00:08", destinationMac: "02:00:00:00:00:10", sourceIp: SERVER, destinationIp: CLIENT, ttl: 58, protocol: "TCP", sourcePort: 443, destinationPort: 51100, flags: "S.", length: 40, frameLength: 58, payload: "TLS Server Hello" },
  { number: 11, time: "0.300000", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:53", sourceIp: CLIENT, destinationIp: "198.51.100.53", ttl: 64, protocol: "UDP", sourcePort: 53001, destinationPort: 53, length: 41, frameLength: 59, dnsQuery: "updates.training.example", payload: "DNS query updates.training.example" },
  { number: 12, time: "0.311110", sourceMac: "02:00:00:00:00:53", destinationMac: "02:00:00:00:00:10", sourceIp: "198.51.100.53", destinationIp: CLIENT, ttl: 55, protocol: "UDP", sourcePort: 53, destinationPort: 53001, length: 58, frameLength: 76, dnsQuery: "updates.training.example", payload: "DNS answer 203.0.113.9" },
  { number: 13, time: "0.408220", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51200, destinationPort: 22, flags: "S", length: 40, frameLength: 58, payload: "SSH handshake" },
  { number: 14, time: "0.412000", sourceMac: "02:00:00:00:00:08", destinationMac: "02:00:00:00:00:10", sourceIp: SERVER, destinationIp: CLIENT, ttl: 58, protocol: "TCP", sourcePort: 22, destinationPort: 51200, flags: "S.", length: 40, frameLength: 58, payload: "SSH handshake response" },
  { number: 15, time: "0.501100", sourceMac: "02:00:00:00:00:20", destinationMac: "02:00:00:00:00:10", sourceIp: "198.51.100.20", destinationIp: CLIENT, ttl: 51, protocol: "ICMP", length: 56, frameLength: 74, payload: "Echo reply" },
  { number: 16, time: "0.602000", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51300, destinationPort: 80, flags: "S", length: 40, frameLength: 58, payload: "SYN" },
  { number: 17, time: "0.603111", sourceMac: "02:00:00:00:00:08", destinationMac: "02:00:00:00:00:10", sourceIp: SERVER, destinationIp: CLIENT, ttl: 58, protocol: "TCP", sourcePort: 80, destinationPort: 51300, flags: "S.", length: 40, frameLength: 58, payload: "SYN ACK" },
  { number: 18, time: "0.700000", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51300, destinationPort: 80, flags: "P.", length: 74, frameLength: 92, httpMethod: "GET", httpHost: "training.example", payload: "GET /help HTTP/1.1 Host: training.example" },
  { number: 19, time: "0.800300", sourceMac: "02:00:00:00:00:08", destinationMac: "02:00:00:00:00:10", sourceIp: SERVER, destinationIp: CLIENT, ttl: 58, protocol: "TCP", sourcePort: 80, destinationPort: 51300, flags: "P.", length: 60, frameLength: 78, httpMethod: "HTTP", httpHost: "training.example", payload: "HTTP/1.1 200 OK" },
  { number: 20, time: "0.900000", sourceMac: "02:00:00:00:00:10", destinationMac: "02:00:00:00:00:08", sourceIp: CLIENT, destinationIp: SERVER, ttl: 64, protocol: "TCP", sourcePort: 51400, destinationPort: 443, flags: "F.", length: 40, frameLength: 58, payload: "FIN ACK" },
];

type Predicate = (packet: TrainingPacket) => boolean;

const DISPLAY_TOKENS = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|>=|<=|==|!=|&&|\|\||[()!<>]|(?:contains|matches|and|or|not)\b|[A-Za-z0-9_.:-]+/gi;

function tokenizeDisplay(source: string): string[] {
  const tokens: string[] = [];
  let consumed = 0;
  for (const match of source.matchAll(DISPLAY_TOKENS)) {
    const gap = source.slice(consumed, match.index);
    if (gap.trim()) throw new Error(`Unexpected filter text: ${gap.trim()}`);
    tokens.push(match[0]);
    consumed = (match.index ?? 0) + match[0].length;
  }
  if (source.slice(consumed).trim()) throw new Error(`Unexpected filter text: ${source.slice(consumed).trim()}`);
  return tokens;
}

function fieldValue(packet: TrainingPacket, field: string): string | number | boolean {
  const fields: Record<string, string | number | boolean> = {
    "ip.addr": [packet.sourceIp, packet.destinationIp].join(" "),
    "ip.src": packet.sourceIp,
    "ip.dst": packet.destinationIp,
    "eth.addr": [packet.sourceMac, packet.destinationMac].join(" "),
    "tcp.port": packet.protocol === "TCP" ? `${packet.sourcePort ?? ""} ${packet.destinationPort ?? ""}` : "",
    "udp.port": packet.protocol === "UDP" ? `${packet.sourcePort ?? ""} ${packet.destinationPort ?? ""}` : "",
    "tcp.srcport": packet.protocol === "TCP" ? packet.sourcePort ?? -1 : -1,
    "tcp.dstport": packet.protocol === "TCP" ? packet.destinationPort ?? -1 : -1,
    "udp.srcport": packet.protocol === "UDP" ? packet.sourcePort ?? -1 : -1,
    "udp.dstport": packet.protocol === "UDP" ? packet.destinationPort ?? -1 : -1,
    "tcp.flags.syn": packet.protocol === "TCP" && packet.flags?.includes("S") === true,
    "frame.len": packet.frameLength,
    "ip.ttl": packet.ttl,
    "dns": Boolean(packet.dnsQuery),
    "http": Boolean(packet.httpHost),
    "icmp": packet.protocol === "ICMP",
    "tcp": packet.protocol === "TCP",
    "udp": packet.protocol === "UDP",
  };
  const value = fields[field.toLowerCase()];
  if (value === undefined) throw new Error(`Unknown packet field "${field}".`);
  return value;
}

export function compileDisplayFilter(source: string): Predicate {
  if (source.length > 300) throw new Error("Keep the display filter under 300 characters.");
  if (!source.trim()) return () => true;
  const tokens = tokenizeDisplay(source);
  let index = 0;
  const peek = () => tokens[index]?.toLowerCase();
  const take = () => tokens[index++];
  const accept = (...values: string[]) => values.includes(peek() ?? "") ? (take(), true) : false;
  const parseValue = (packet: TrainingPacket, field: string): boolean => {
    const current = fieldValue(packet, field);
    const operator = peek();
    if (!operator || !["==", "!=", ">", "<", ">=", "<=", "contains", "matches"].includes(operator)) {
      return typeof current === "boolean" ? current : Boolean(current);
    }
    take();
    const expectedToken = take();
    if (!expectedToken) throw new Error("A filter comparison needs a value.");
    const expected = expectedToken.replace(/^['"]|['"]$/g, "");
    if (operator === "contains") {
      const actual = field.toLowerCase() === "tcp" ? packet.payload
        : field.toLowerCase() === "http" ? `${packet.httpHost ?? ""} ${packet.payload}`
          : field.toLowerCase() === "dns" ? packet.dnsQuery ?? ""
            : String(current);
      return actual.toLowerCase().includes(expected.toLowerCase());
    }
    if (operator === "matches") {
      if (expected.length > 80) throw new Error("Keep regular-expression filters under 80 characters.");
      try {
        return new RegExp(expected, "i").test(String(current));
      } catch {
        throw new Error("That matches filter is not a valid regular expression.");
      }
    }
    if (typeof current === "number") {
      const number = Number(expected);
      if (!Number.isFinite(number)) throw new Error(`"${expected}" is not a number for ${field}.`);
      if (operator === "==") return current === number;
      if (operator === "!=") return current !== number;
      if (operator === ">") return current > number;
      if (operator === "<") return current < number;
      if (operator === ">=") return current >= number;
      return current <= number;
    }
    const equal = typeof current === "boolean"
      ? current === (expected === "1" || expected.toLowerCase() === "true")
      : String(current).toLowerCase().split(" ").includes(expected.toLowerCase());
    return operator === "==" ? equal : operator === "!=" ? !equal : false;
  };

  const parsePrimary = (packet: TrainingPacket): boolean => {
    if (accept("!", "not")) return !parsePrimary(packet);
    if (accept("(")) {
      const result = parseOr(packet);
      if (!accept(")")) throw new Error("Add a closing parenthesis.");
      return result;
    }
    const field = take();
    if (!field) throw new Error("Expected a packet field such as ip.addr or tcp.port.");
    return parseValue(packet, field);
  };
  const parseAnd = (packet: TrainingPacket): boolean => {
    let result = parsePrimary(packet);
    while (accept("and", "&&")) {
      const right = parsePrimary(packet);
      result = result && right;
    }
    return result;
  };
  const parseOr = (packet: TrainingPacket): boolean => {
    let result = parseAnd(packet);
    while (accept("or", "||")) {
      const right = parseAnd(packet);
      result = result || right;
    }
    return result;
  };
  const predicate = (packet: TrainingPacket) => {
    index = 0;
    const result = parseOr(packet);
    if (index !== tokens.length) throw new Error(`Unexpected filter token "${tokens[index]}".`);
    return result;
  };
  predicate(TRAINING_CAPTURE[0]);
  return predicate;
}

function ipInCidr(address: string, range: string): boolean {
  const [network, bitsText] = range.split("/");
  const bits = Number(bitsText ?? "32");
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(network) || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const toNumber = (ip: string) => ip.split(".").reduce((value, octet) => value * 256 + Number(octet), 0);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (toNumber(address) & mask) === (toNumber(network) & mask);
}

export function compileCaptureFilter(source: string): Predicate {
  if (source.length > 300) throw new Error("Keep the capture filter under 300 characters.");
  if (!source.trim()) return () => true;
  const tokens = source.match(/[()!]|[A-Za-z0-9./:-]+/g) ?? [];
  let index = 0;
  const peek = () => tokens[index]?.toLowerCase();
  const take = () => tokens[index++];
  const accept = (...values: string[]) => values.includes(peek() ?? "") ? (take(), true) : false;
  const startsPrimary = () => ["(", "!", "tcp", "udp", "icmp", "host", "src", "dst", "port", "net"].includes(peek() ?? "");
  const parsePrimary = (packet: TrainingPacket): boolean => {
    if (accept("!", "not")) return !parsePrimary(packet);
    if (accept("(")) {
      const result = parseOr(packet);
      if (!accept(")")) throw new Error("Add a closing parenthesis.");
      return result;
    }
    const first = take()?.toLowerCase();
    if (!first) throw new Error("Expected a BPF filter such as tcp port 80.");
    if (first === "tcp" || first === "udp" || first === "icmp") {
      if (first === "tcp" || first === "udp") {
        const protocol = first.toUpperCase();
        let result = packet.protocol === protocol;
        if (peek() === "port") {
          take();
          const portText = take();
          const port = Number(portText);
          if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Use a valid port number from 0 to 65535.");
          result = result && (packet.sourcePort === port || packet.destinationPort === port);
        }
        return result;
      }
      return packet.protocol === "ICMP";
    }
    if (first === "host" || first === "src" || first === "dst" || first === "port" || first === "net") {
      let direction: "src" | "dst" | "any" = "any";
      let kind = first;
      if (first === "src" || first === "dst") {
        direction = first;
        kind = take()?.toLowerCase() ?? "";
      }
      const value = take();
      if (!value) throw new Error("A BPF filter condition needs a value.");
      if (kind === "host") {
        return direction === "src" ? packet.sourceIp === value
          : direction === "dst" ? packet.destinationIp === value
            : packet.sourceIp === value || packet.destinationIp === value;
      }
      if (kind === "port") {
        const port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Use a valid port number from 0 to 65535.");
        return direction === "src" ? packet.sourcePort === port
          : direction === "dst" ? packet.destinationPort === port
            : packet.sourcePort === port || packet.destinationPort === port;
      }
      if (kind === "net") {
        return direction === "src" ? ipInCidr(packet.sourceIp, value)
          : direction === "dst" ? ipInCidr(packet.destinationIp, value)
            : ipInCidr(packet.sourceIp, value) || ipInCidr(packet.destinationIp, value);
      }
      throw new Error(`Unsupported BPF condition "${kind}".`);
    }
    throw new Error(`Unsupported BPF token "${first}".`);
  };
  const parseAnd = (packet: TrainingPacket): boolean => {
    let result = parsePrimary(packet);
    while (accept("and") || startsPrimary()) {
      const right = parsePrimary(packet);
      result = result && right;
    }
    return result;
  };
  const parseOr = (packet: TrainingPacket): boolean => {
    let result = parseAnd(packet);
    while (accept("or")) {
      const right = parseAnd(packet);
      result = result || right;
    }
    return result;
  };
  const predicate = (packet: TrainingPacket) => {
    index = 0;
    const result = parseOr(packet);
    if (index !== tokens.length) throw new Error(`Unexpected BPF token "${tokens[index]}".`);
    return result;
  };
  predicate(TRAINING_CAPTURE[0]);
  return predicate;
}
