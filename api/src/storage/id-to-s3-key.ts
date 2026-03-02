/**
 * Generate S3 key from sequential ID.
 * ID 1 -> pdf/000/000/001/document.pdf
 * ID 1234 -> pdf/000/001/234/document.pdf
 * thumbnail: thumbnail/000/000/001/thumb.jpg
 * captured: captured/000/000/001/{uuid}.png
 */
export function idToS3Key(
  id: number,
  type: 'pdf' | 'image' | 'thumbnail' | 'captured',
  uuid?: string,
): string {
  const padded = String(id).padStart(9, '0')
  const a = padded.slice(0, 3)
  const b = padded.slice(3, 6)
  const c = padded.slice(6, 9)
  if (type === 'pdf') return `pdf/${a}/${b}/${c}/document.pdf`
  if (type === 'thumbnail') return `thumbnail/${a}/${b}/${c}/thumb.jpg`
  if (type === 'captured') return `captured/${a}/${b}/${c}/${uuid ?? 'image'}.png`
  return `image/${a}/${b}/${c}/page.jpg`
}
