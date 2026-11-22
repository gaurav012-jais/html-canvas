export function createOtpCountdown(sendBtn, inlineResendBtn) {
  let timer = null

  const updateDisplay = (text, disabled) => {
    if (sendBtn) {
      sendBtn.textContent = text
      sendBtn.disabled = disabled
    }
    if (inlineResendBtn) {
      inlineResendBtn.textContent = text
      inlineResendBtn.disabled = disabled
      inlineResendBtn.style.opacity = disabled ? '0.6' : '1'
      inlineResendBtn.style.cursor = disabled ? 'not-allowed' : 'pointer'
    }
  }

  const start = (seconds, onFinish) => {
    stop()
    let timeLeft = seconds
    updateDisplay(`Resend in ${timeLeft}s`, true)

    timer = setInterval(() => {
      timeLeft -= 1
      if (timeLeft <= 0) {
        stop()
        updateDisplay('Resend code', false)
        if (typeof onFinish === 'function') onFinish()
      } else {
        updateDisplay(`Resend in ${timeLeft}s`, true)
      }
    }, 1000)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { start, stop, updateDisplay }
}
