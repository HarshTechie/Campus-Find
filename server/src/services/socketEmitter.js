let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function emit(event, payload) {
  try {
    if (!ioInstance) {
      console.warn('socketEmitter: io not set, cannot emit', event);
      return false;
    }
    ioInstance.emit(event, payload);
    return true;
  } catch (err) {
    console.error('socketEmitter.emit error', err);
    return false;
  }
}

module.exports = { setIo, emit };