// The red star on a mandatory field label. aria-hidden with a text fallback:
// a screen reader gets "required" from the input's own required attribute, and
// a lone "*" read aloud mid-label is noise.
export default function Req() {
  return <span className="req-star" aria-hidden="true"> *</span>;
}
