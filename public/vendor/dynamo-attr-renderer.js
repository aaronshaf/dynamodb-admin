/**
 * DynamoDB Attribute Map Renderer
 *
 * A lightweight collapsible tree renderer for DynamoDB attribute map values.
 * Renders {S:"..."}, {N:"..."}, {BOOL:...}, {NULL:...}, {L:[...]}, {M:{...}}
 * as a collapsible JSON-like tree, reusing json-formatter CSS classes for
 * consistent styling. Numbers are always displayed with full precision.
 *
 * Usage:
 *   const el = DynamoAttrRenderer.render(attrValue)
 *   container.appendChild(el)
 */
window.DynamoAttrRenderer = (function () {
  'use strict'

  function el(tag, className, text) {
    var e = document.createElement(tag)
    if (className) e.className = className
    if (text !== undefined) e.textContent = text
    return e
  }

  /**
   * Render a DynamoDB attribute value as a DOM element.
   */
  function renderValue(attr) {
    if (attr == null) return el('span', 'json-formatter-null', 'null')
    if (attr.S !== undefined) return el('span', 'json-formatter-string', '"' + escapeString(attr.S) + '"')
    if (attr.N !== undefined) return renderNumber(attr.N)
    if (attr.BOOL !== undefined) return el('span', 'json-formatter-boolean', String(attr.BOOL))
    if (attr.NULL) return el('span', 'json-formatter-null', 'null')
    if (attr.L) return renderList(attr.L)
    if (attr.M) return renderMap(attr.M)
    if (attr.B) return el('span', 'json-formatter-string', '"<Binary>"')
    if (attr.SS) return renderStringSet(attr.SS)
    if (attr.NS) return renderNumberSet(attr.NS)
    if (attr.BS) return el('span', 'json-formatter-string', '"<BinarySet>"')
    // Fallback
    return el('span', '', JSON.stringify(attr))
  }

  /**
   * Detect if a numeric string looks like a timestamp and return a
   * human-readable date string, or null if it doesn't look like one.
   */
  function detectDate(numStr) {
    if (!/^\d+$/.test(numStr)) return null
    var num = Number(numStr)
    if (!isFinite(num)) return null

    var date, label
    if (num >= 1e18) {
      date = new Date(num / 1e6)
      label = 'assumed nanoseconds since epoch'
    } else if (num >= 1e15) {
      date = new Date(num / 1e3)
      label = 'assumed microseconds since epoch'
    } else if (num >= 1e10) {
      date = new Date(num)
      label = 'assumed milliseconds since epoch'
    } else if (num >= 1e8) {
      date = new Date(num * 1000)
      label = 'assumed seconds since epoch'
    }

    if (date && !isNaN(date)) {
      return date.toISOString() + ' (' + label + ')'
    }
    return null
  }

  /**
   * Render a DynamoDB N value. If it looks like a timestamp, wrap it in
   * an <abbr> with a tooltip showing the interpreted date.
   */
  function renderNumber(numStr) {
    var span = el('span', 'json-formatter-number', numStr)
    var dateStr = detectDate(numStr)
    if (dateStr) {
      var abbr = document.createElement('abbr')
      abbr.setAttribute('data-toggle', 'tooltip')
      abbr.setAttribute('data-placement', 'top')
      abbr.setAttribute('title', dateStr)
      abbr.appendChild(span)
      return abbr
    }
    return span
  }

  function renderMap(map) {
    var keys = Object.keys(map)
    if (keys.length === 0) {
      return el('span', 'json-formatter-bracket', '{}')
    }

    var row = el('div', 'json-formatter-row json-formatter-open')

    // Toggler link
    var link = el('a', 'json-formatter-toggler-link')
    var toggler = el('span', 'json-formatter-toggler')
    link.appendChild(toggler)

    var typeLabel = el('span', '', 'Object ')
    link.appendChild(typeLabel)

    // Preview (shown when collapsed)
    var preview = el('span', 'json-formatter-preview-text')
    preview.textContent = '{' + keys.slice(0, 3).map(function (k) { return JSON.stringify(k) + ': ...' }).join(', ') + (keys.length > 3 ? ', ...' : '') + '}'
    link.appendChild(preview)

    row.appendChild(link)

    // Children
    var children = el('div', 'json-formatter-children')
    keys.forEach(function (key) {
      var childRow = el('div', 'json-formatter-row')
      var childLink = el('a')
      var keySpan = el('span', 'json-formatter-key', key + ':')
      childLink.appendChild(keySpan)
      childLink.appendChild(document.createTextNode(' '))
      childLink.appendChild(renderValue(map[key]))
      childRow.appendChild(childLink)
      children.appendChild(childRow)
    })
    row.appendChild(children)

    // Toggle behavior
    link.addEventListener('click', function (e) {
      e.preventDefault()
      row.classList.toggle('json-formatter-open')
    })

    return row
  }

  function renderList(list) {
    if (list.length === 0) {
      return el('span', 'json-formatter-bracket', '[]')
    }

    var row = el('div', 'json-formatter-row json-formatter-open')

    // Toggler link
    var link = el('a', 'json-formatter-toggler-link')
    var toggler = el('span', 'json-formatter-toggler')
    link.appendChild(toggler)

    var typeLabel = el('span', 'json-formatter-bracket', 'Array[' + list.length + '] ')
    link.appendChild(typeLabel)

    // Preview
    var preview = el('span', 'json-formatter-preview-text')
    preview.textContent = '[...]'
    link.appendChild(preview)

    row.appendChild(link)

    // Children
    var children = el('div', 'json-formatter-children')
    list.forEach(function (item, i) {
      var childRow = el('div', 'json-formatter-row')
      var childLink = el('a')
      var keySpan = el('span', 'json-formatter-key', i + ':')
      childLink.appendChild(keySpan)
      childLink.appendChild(document.createTextNode(' '))
      childLink.appendChild(renderValue(item))
      childRow.appendChild(childLink)
      children.appendChild(childRow)
    })
    row.appendChild(children)

    // Toggle behavior
    link.addEventListener('click', function (e) {
      e.preventDefault()
      row.classList.toggle('json-formatter-open')
    })

    return row
  }

  function renderStringSet(ss) {
    var row = el('div', 'json-formatter-row json-formatter-open')
    var link = el('a', 'json-formatter-toggler-link')
    var toggler = el('span', 'json-formatter-toggler')
    link.appendChild(toggler)
    link.appendChild(el('span', 'json-formatter-bracket', 'StringSet[' + ss.length + '] '))
    var preview = el('span', 'json-formatter-preview-text', '[...]')
    link.appendChild(preview)
    row.appendChild(link)

    var children = el('div', 'json-formatter-children')
    ss.forEach(function (s, i) {
      var childRow = el('div', 'json-formatter-row')
      var childLink = el('a')
      childLink.appendChild(el('span', 'json-formatter-key', i + ':'))
      childLink.appendChild(document.createTextNode(' '))
      childLink.appendChild(el('span', 'json-formatter-string', '"' + escapeString(s) + '"'))
      childRow.appendChild(childLink)
      children.appendChild(childRow)
    })
    row.appendChild(children)

    link.addEventListener('click', function (e) {
      e.preventDefault()
      row.classList.toggle('json-formatter-open')
    })
    return row
  }

  function renderNumberSet(ns) {
    var row = el('div', 'json-formatter-row json-formatter-open')
    var link = el('a', 'json-formatter-toggler-link')
    var toggler = el('span', 'json-formatter-toggler')
    link.appendChild(toggler)
    link.appendChild(el('span', 'json-formatter-bracket', 'NumberSet[' + ns.length + '] '))
    var preview = el('span', 'json-formatter-preview-text', '[...]')
    link.appendChild(preview)
    row.appendChild(link)

    var children = el('div', 'json-formatter-children')
    ns.forEach(function (n, i) {
      var childRow = el('div', 'json-formatter-row')
      var childLink = el('a')
      childLink.appendChild(el('span', 'json-formatter-key', i + ':'))
      childLink.appendChild(document.createTextNode(' '))
      childLink.appendChild(el('span', 'json-formatter-number', n))
      childRow.appendChild(childLink)
      children.appendChild(childRow)
    })
    row.appendChild(children)

    link.addEventListener('click', function (e) {
      e.preventDefault()
      row.classList.toggle('json-formatter-open')
    })
    return row
  }

  function escapeString(s) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  }

  return {
    render: renderValue
  }
})()
