import Prism from 'prismjs'
import 'prismjs/components/'
import { v4 as uuidv4 } from 'uuid'
import mainTemplate from './templates/main.handlebars'
import pasteTemplate from './templates/paste.handlebars'

declare const PASTESPACE: KVNamespace

export async function handleRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    if (url.pathname === '/') {
      return handleRoot(request)
    } else if (url.pathname === '/post') {
      return handlePost(request)
    } else {
      return handleRetrievePaste(request, url)
    }
  } catch (e) {
    return new Response(e.toString(), { status: 500 })
  }
}

async function handleRoot(request: Request): Promise<Response> {
  return new Response(mainTemplate({ siteName: 'Paste Ploughman' }), {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

async function handlePost(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('', { status: 405 })
  }

  let pasteContents
  let usingJson = false
  let doRedirect = false

  const contentType = request.headers.get('Content-Type') || ''
  if (contentType.startsWith('application/json')) {
    const json = await request.json()
    if (typeof json.text !== 'string') {
      return new Response(JSON.stringify({ error: 'No text provided.' }), {
        status: 400,
      })
    }
    pasteContents = json.text
    usingJson = true
  } else if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const params = await request.formData()
    if (params.get('text') === null) {
      return new Response(JSON.stringify({ error: 'No text provided.' }), {
        status: 400,
      })
    } else {
      pasteContents = params.get('text')
    }
    if (params.has('submit')) {
      doRedirect = true
    }
  } else {
    pasteContents = await request.text()
  }

  const id = uuidv4()
  await PASTESPACE.put('paste:' + id, pasteContents, {
    expirationTtl: 60 * 60 * 24 * 3,
  })
  if (doRedirect) {
    return new Response('', {
      status: 302,
      headers: {
        Location: '/' + id,
      },
    })
  } else if (usingJson) {
    return new Response(JSON.stringify({ id }), { status: 201 })
  } else {
    return new Response(id, { status: 201 })
  }
}

async function handleRetrievePaste(
  request: Request,
  url: URL,
): Promise<Response> {
  let pasteId = url.pathname.substring(1)
  let language = undefined
  const languageSeparator = pasteId.indexOf('.')
  if (languageSeparator !== -1 && languageSeparator + 1 < pasteId.length) {
    language = pasteId.substring(languageSeparator + 1)
    pasteId = pasteId.substring(0, languageSeparator)
  }

  const paste = await PASTESPACE.get('paste:' + pasteId, 'text')
  if (paste === null) {
    return notFound()
  }

  let formattedPaste
  if (typeof language === 'undefined' || language === 'raw') {
    return new Response(paste, { headers: { 'Content-Type': 'text/plain' } })
  } else {
    formattedPaste = Prism.highlight(
      paste,
      Prism.languages[language] || 'plaintext',
      language,
    )
  }

  const rendered = pasteTemplate({
    id: pasteId,
    siteName: 'Paste Ploughman',
    highlightedPaste: formattedPaste,
    language: language,
  })

  return new Response(rendered, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

async function notFound(): Promise<Response> {
  return new Response('four oh four', { status: 404 })
}
