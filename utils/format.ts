const krwFormatter = new Intl.NumberFormat("ko-KR");

export function formatKrw(value: number) {
  return `${krwFormatter.format(value)}원`;
}

export function formatNumber(value: number) {
  return krwFormatter.format(value);
}
