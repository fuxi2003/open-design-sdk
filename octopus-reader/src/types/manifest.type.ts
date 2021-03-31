export type ArtboardManifestData = {
  'artboard_original_id': string
  'artboard_name': string | null

  'failed': boolean
  'url': string | null
  'preview_url': string | null

  'is_symbol': boolean
  'symbol_id'?: string | null

  'page_name'?: string | null
  'page_original_id'?: string | null
}

export type ManifestData = {
  'artboards': Array<ArtboardManifestData>
  'pages': Record<string, string> | null
}
