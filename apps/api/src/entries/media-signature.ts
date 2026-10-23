export interface DetectedMedia {
  mimeType: string;
  extension: string;
}

export const detectMedia = (buffer: Buffer): DetectedMedia | null => {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return { mimeType: 'image/png', extension: '.png' };
  if (
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'
  )
    return { mimeType: 'image/webp', extension: '.webp' };
  if (
    buffer.subarray(0, 3).toString() === 'ID3' ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  )
    return { mimeType: 'audio/mpeg', extension: '.mp3' };
  if (
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WAVE'
  )
    return { mimeType: 'audio/wav', extension: '.wav' };
  if (buffer.subarray(0, 4).toString() === 'OggS')
    return { mimeType: 'audio/ogg', extension: '.ogg' };
  if (buffer.subarray(4, 8).toString() === 'ftyp')
    return { mimeType: 'audio/mp4', extension: '.m4a' };
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
    return { mimeType: 'audio/webm', extension: '.webm' };
  return null;
};
