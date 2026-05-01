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
    return el('span', '', JSON.stringify(attr))
  }

  // -- Timestamp detection for number tooltips --

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

  // -- Collapsible container (shared by Map, List, and Set renderers) --

  /**
   * Render a collapsible container with a toggler, type label, preview, and children.
   * @param {string} typeLabel - e.g. "Object ", "Array[3] ", "StringSet[2] "
   * @param {string} typeLabelClass - CSS class for the type label span
   * @param {string} previewText - text shown when collapsed, e.g. "{...}", "[...]"
   * @param {Array} items - array of {key, value} where value is a DOM element
   */
  function renderCollapsible(typeLabel, typeLabelClass, previewText, items) {
    var row = el('div', 'json-formatter-row json-formatter-open')

    var link = el('a', 'json-formatter-toggler-link')
    link.appendChild(el('span', 'json-formatter-toggler'))
    link.appendChild(el('span', typeLabelClass, typeLabel))
    link.appendChild(el('span', 'json-formatter-preview-text', previewText))
    row.appendChild(link)

    var children = el('div', 'json-formatter-children')
    items.forEach(function (item) {
      var childRow = el('div', 'json-formatter-row')
      var childLink = el('a')
      childLink.appendChild(el('span', 'json-formatter-key', item.key + ':'))
      childLink.appendChild(document.createTextNode(' '))
      childLink.appendChild(item.value)
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

  // -- Type-specific renderers --

  function renderMap(map) {
    var keys = Object.keys(map)
    if (keys.length === 0) return el('span', 'json-formatter-bracket', '{}')

    var preview = '{' + keys.slice(0, 3).map(function (k) { return JSON.stringify(k) + ': ...' }).join(', ') + (keys.length > 3 ? ', ...' : '') + '}'
    var items = keys.map(function (key) {
      return { key: key, value: renderValue(map[key]) }
    })
    return renderCollapsible('Object ', '', preview, items)
  }

  function renderList(list) {
    if (list.length === 0) return el('span', 'json-formatter-bracket', '[]')

    var items = list.map(function (item, i) {
      return { key: i, value: renderValue(item) }
    })
    return renderCollapsible('Array[' + list.length + '] ', 'json-formatter-bracket', '[...]', items)
  }

  function renderStringSet(ss) {
    var items = ss.map(function (s, i) {
      return { key: i, value: el('span', 'json-formatter-string', '"' + escapeString(s) + '"') }
    })
    return renderCollapsible('StringSet[' + ss.length + '] ', 'json-formatter-bracket', '[...]', items)
  }

  function renderNumberSet(ns) {
    var items = ns.map(function (n, i) {
      return { key: i, value: renderNumber(n) }
    })
    return renderCollapsible('NumberSet[' + ns.length + '] ', 'json-formatter-bracket', '[...]', items)
  }

  function escapeString(s) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  }

  return {
    render: renderValue
  }
})()
