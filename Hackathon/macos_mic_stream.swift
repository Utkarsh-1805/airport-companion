import AVFoundation
import Foundation

func stderr(_ message: String) {
    if let data = (message + "\n").data(using: .utf8) {
        FileHandle.standardError.write(data)
    }
}

func fail(_ message: String) -> Never {
    stderr(message)
    exit(1)
}

let args = CommandLine.arguments
guard args.count >= 3,
      let targetRate = Double(args[1]),
      let chunkFrames = Int(args[2]) else {
    fail("Usage: macos_mic_stream.swift <sample_rate> <chunk_frames>")
}

let permissionSemaphore = DispatchSemaphore(value: 0)
var microphoneAllowed = false

AVCaptureDevice.requestAccess(for: .audio) { allowed in
    microphoneAllowed = allowed
    permissionSemaphore.signal()
}
permissionSemaphore.wait()

guard microphoneAllowed else {
    fail("Microphone permission denied.")
}

let engine = AVAudioEngine()
let input = engine.inputNode
let inputFormat = input.outputFormat(forBus: 0)

guard let outputFormat = AVAudioFormat(
    commonFormat: .pcmFormatInt16,
    sampleRate: targetRate,
    channels: 1,
    interleaved: true
) else {
    fail("Could not create output audio format.")
}

guard let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else {
    fail("Could not create audio converter.")
}

let bytesPerChunk = chunkFrames * MemoryLayout<Int16>.size
let stdout = FileHandle.standardOutput
let writeLock = NSLock()
var pending = Data()

input.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { buffer, _ in
    let ratio = targetRate / inputFormat.sampleRate
    let frameCapacity = AVAudioFrameCount(max(1, Int(Double(buffer.frameLength) * ratio) + 32))

    guard let converted = AVAudioPCMBuffer(
        pcmFormat: outputFormat,
        frameCapacity: frameCapacity
    ) else {
        return
    }

    var alreadyProvidedInput = false
    var conversionError: NSError?

    let status = converter.convert(to: converted, error: &conversionError) { _, outStatus in
        if alreadyProvidedInput {
            outStatus.pointee = .noDataNow
            return nil
        }

        alreadyProvidedInput = true
        outStatus.pointee = .haveData
        return buffer
    }

    guard status != .error else {
        if let conversionError {
            stderr("Audio conversion error: \(conversionError.localizedDescription)")
        }
        return
    }

    let audioBuffer = converted.audioBufferList.pointee.mBuffers
    guard let dataPointer = audioBuffer.mData else {
        return
    }

    let byteCount = Int(audioBuffer.mDataByteSize)
    guard byteCount > 0 else {
        return
    }

    writeLock.lock()
    pending.append(Data(bytes: dataPointer, count: byteCount))
    while pending.count >= bytesPerChunk {
        stdout.write(pending.prefix(bytesPerChunk))
        pending.removeFirst(bytesPerChunk)
    }
    writeLock.unlock()
}

do {
    try engine.start()
} catch {
    fail("Could not start microphone: \(error.localizedDescription)")
}

stderr("Microphone helper ready.")
RunLoop.current.run()
