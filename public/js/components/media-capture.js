class MediaCapture {
  constructor() { this.stream = null; this.recorder = null; this.cancelled = false; this.requestId = 0; this.cancelledRecorders = new WeakSet(); }
  beginRequest() { this.cancelled = false; return ++this.requestId; }
  isCurrent(requestId) { return requestId === this.requestId; }
  attach(stream, recorder) { this.cleanup(); this.stream = stream; this.recorder = recorder; this.cancelled = false; }
  cleanup() {
    if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
    this.stream = null; this.recorder = null;
  }
  wasCancelled(recorder) { return this.cancelledRecorders.has(recorder); }
  cancel() {
    this.requestId += 1;
    this.cancelled = true;
    const recorder = this.recorder;
    if (recorder) this.cancelledRecorders.add(recorder);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    this.cleanup();
  }
}
window.FixItMediaCapture = new MediaCapture();
