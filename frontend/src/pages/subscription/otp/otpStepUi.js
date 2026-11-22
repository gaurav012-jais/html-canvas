export function ensureStep2Footer(isTwoStepOtp, changeNumberBtn, verifyBtn, onSend) {
  let footer = null
  let btnChange = changeNumberBtn

  if (isTwoStepOtp && !btnChange && verifyBtn && verifyBtn.parentNode) {
    footer = document.createElement('div')
    footer.className = 'otp-step2-actions'
    footer.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;margin-top:14px;font-size:12.5px;gap:8px;'

    btnChange = document.createElement('button')
    btnChange.type = 'button'
    btnChange.setAttribute('data-otp-action', 'change-phone')
    btnChange.textContent = '← Change number'
    btnChange.style.cssText =
      'background:none;border:none;color:#059669;font-size:12.5px;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;'

    const resendBtn = document.createElement('button')
    resendBtn.type = 'button'
    resendBtn.className = 'otp-resend-link'
    resendBtn.textContent = 'Resend code'
    resendBtn.style.cssText =
      'background:none;border:none;color:#64748b;font-size:12.5px;font-weight:600;cursor:pointer;padding:0;'

    footer.appendChild(btnChange)
    footer.appendChild(resendBtn)
    verifyBtn.insertAdjacentElement('afterend', footer)

    resendBtn.addEventListener('click', (e) => {
      e.preventDefault()
      if (!resendBtn.disabled) {
        onSend(e)
      }
    })
  }

  return { step2Footer: footer, changeNumberBtn: btnChange }
}

export function toggleOtpStep({
  step,
  isTwoStepOtp,
  phoneBlock,
  sendBtn,
  otpBlock,
  verifyBtn,
  step2Footer,
  existingResendRow,
  otpInput,
}) {
  if (!isTwoStepOtp) return
  if (step === 1) {
    if (phoneBlock) {
      phoneBlock.hidden = false
      phoneBlock.style.display = ''
    }
    if (sendBtn) {
      sendBtn.hidden = false
      sendBtn.style.display = ''
    }
    if (otpBlock) {
      otpBlock.hidden = true
      otpBlock.style.display = 'none'
    }
    if (verifyBtn) {
      verifyBtn.hidden = true
      verifyBtn.style.display = 'none'
    }
    if (step2Footer) {
      step2Footer.hidden = true
      step2Footer.style.display = 'none'
    }
    if (existingResendRow) {
      existingResendRow.hidden = true
      existingResendRow.style.display = 'none'
    }
  } else if (step === 2) {
    if (phoneBlock) {
      phoneBlock.hidden = true
      phoneBlock.style.display = 'none'
    }
    if (sendBtn) {
      sendBtn.hidden = true
      sendBtn.style.display = 'none'
    }
    if (otpBlock) {
      otpBlock.hidden = false
      otpBlock.style.display = ''
    }
    if (verifyBtn) {
      verifyBtn.hidden = false
      verifyBtn.style.display = ''
    }
    if (step2Footer) {
      step2Footer.hidden = false
      step2Footer.style.display = 'flex'
    }
    if (existingResendRow) {
      existingResendRow.hidden = false
      existingResendRow.style.display = ''
    }
    if (otpInput) {
      setTimeout(() => otpInput.focus?.(), 50)
    }
  }
}
