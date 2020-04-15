;(() => {
  const css = String.raw

  // Returns the text before and after the cursor.
  const getText = () => {
    const selection = document.getSelection()
    if (!selection.isCollapsed) return null

    const range = document.getSelection().getRangeAt(0)

    const container = range.startContainer.closest
      ? range.startContainer.closest('[data-block-id]')
      : range.startContainer.parentNode.closest
      ? range.startContainer.parentNode.closest('[data-block-id]')
      : null
    if (!container) return null
    if (!container.firstChild) return null
    if (!container.lastChild) return null

    const page = container.closest('.notion-page-content')
    if (!page) return null
    const leafBlocks = new Set([...page.querySelectorAll('[data-block-id]')])
    for (const block of [...leafBlocks]) {
      const parentBlock = block.parentNode.closest('[data-block-id]')
      if (parentBlock) leafBlocks.delete(parentBlock)
    }
    const surroundingContext = { before: [], after: [] }
    let target = 'before'
    for (const block of leafBlocks) {
      if (block === container) {
        target = 'after'
      } else {
        surroundingContext[target].push(block.textContent)
      }
    }
    const beforeRange = range.cloneRange()
    beforeRange.setStartBefore(container.firstChild)
    const afterRange = range.cloneRange()
    afterRange.setEndAfter(container.lastChild)

    return {
      before: [...surroundingContext.before, beforeRange.toString()].join('\n'),
      after: [afterRange.toString(), ...surroundingContext.after].join('\n'),
    }
  }

  let m = window.TabNineForNotion
  if (!m) {
    m = window.TabNineForNotion = {}
  }
  if (!m.inputListenerAdded) {
    m.inputListenerAdded = true
    window.addEventListener('input', (e) => m.handleInput(e))
  }
  if (!m.keydownListenerAdded) {
    m.keydownListenerAdded = true
    window.addEventListener('keydown', (e) => m.handleKeyDown(e), true)
  }
  m.handleKeyDown = async (e) => {
    if (m.popupElement && m.popupElement.handleKeyDown) {
      m.popupElement.handleKeyDown(e)
    }
  }
  m.handleInput = async () => {
    const text = getText()
    m.lastText = text
    if (!text) return
    const requestBody = {
      version: '1.0.0',
      request: {
        Autocomplete: {
          ...text,
          region_includes_beginning: true,
          region_includes_end: true,
          filename: '/notion/text.md',
        },
      },
    }
    m.lastRequest = requestBody
    const response = await fetch('http://localhost:8123/tabnine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(requestBody),
    }).then((r) => r.json())
    m.lastResponse = response
    if (response.results.length > 0) {
      const r = document.getSelection().getRangeAt(0).cloneRange()
      if (r.startOffset - response.old_prefix.length >= 0) {
        r.setStart(r.startContainer, r.startOffset - response.old_prefix.length)
      }
      showPopup(response, r.getBoundingClientRect())
    } else {
      hidePopup()
    }
  }
  function showPopup(r, rect) {
    if (m.popupElement) hidePopup()
    m.popupElement = document.createElement('div')
    m.popupElement.setAttribute(
      'style',
      css`
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica,
          'Apple Color Emoji', Arial, sans-serif, 'Segoe UI Emoji',
          'Segoe UI Symbol';
        position: fixed;
        top: ${rect.bottom}px;
        left: ${rect.left}px;
        line-height: 1.5;
        padding: 3px;
        background: #fff;
        color: #888;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
        white-space: pre;
        z-index: 999;
        overflow: hidden;
        border: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      `,
    )
    const suggestions = []
    for (const result of r.results) {
      const div = document.createElement('div')
      div.setAttribute(
        'style',
        css`
          display: flex;
          align-items: baseline;
          padding: 0 4px;
        `,
      )
      const textDiv = document.createElement('div')
      textDiv.textContent = r.old_prefix
      const span = document.createElement('span')
      const textToInsert = result.new_prefix.slice(
        r.old_prefix.length,
        result.new_prefix.length - result.old_suffix.length,
      )
      span.textContent = textToInsert
      span.setAttribute(
        'style',
        css`
          color: black;
          font-weight: bold;
          background: rgba(0, 0, 0, 0.1);
          margin: -1px -1px;
          padding: 1px 1px;
        `,
      )
      textDiv.appendChild(span)
      textDiv.appendChild(document.createTextNode(result.new_suffix))
      const detailDiv = document.createElement('div')
      detailDiv.setAttribute(
        'style',
        css`
          font-size: 85%;
          margin-left: auto;
          padding-left: 1ex;
        `,
      )
      detailDiv.textContent = result.detail
      div.appendChild(textDiv)
      div.appendChild(detailDiv)
      m.popupElement.appendChild(div)
      suggestions.push({ div, textToInsert })
    }
    for (const message of r.user_message || []) {
      const div = document.createElement('div')
      div.setAttribute(
        'style',
        css`
          padding: 0 4px;
          font-size: 85%;
        `,
      )
      div.textContent = message
      m.popupElement.appendChild(div)
    }
    let suggestionIndex = -1
    const updateSuggestion = (index) => {
      if (suggestionIndex > -1) {
        suggestions[suggestionIndex].div.style.background = ''
      }
      suggestionIndex = index
      suggestions[suggestionIndex].div.style.background = 'rgba(0, 0, 0, 0.1)'
    }
    updateSuggestion(0)
    m.popupElement.handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        document.execCommand(
          'insertText',
          false,
          suggestions[suggestionIndex].textToInsert,
        )
        hidePopup()
      } else if (e.key === 'ArrowUp') {
        updateSuggestion(
          (suggestionIndex + suggestions.length - 1) % suggestions.length,
        )
        e.preventDefault()
        e.stopPropagation()
      } else if (e.key === 'ArrowDown') {
        updateSuggestion((suggestionIndex + 1) % suggestions.length)
        e.preventDefault()
        e.stopPropagation()
      } else if (e.key === 'Escape') {
        hidePopup()
        e.preventDefault()
        e.stopPropagation()
      } else {
        hidePopup()
      }
    }
    if (m.leftover) {
      m.leftover.remove()
      m.leftover = null
    }
    document.body.appendChild(m.popupElement)
  }
  function hidePopup() {
    if (m.popupElement) {
      if (m.leftover) {
        m.leftover.remove()
        m.leftover = null
      }
      const currentLeftover = (m.leftover = m.popupElement)
      setTimeout(() => {
        if (m.leftover === currentLeftover) {
          currentLeftover.remove()
          m.leftover = null
        }
      }, 100)
      m.popupElement = null
    }
  }
})()
