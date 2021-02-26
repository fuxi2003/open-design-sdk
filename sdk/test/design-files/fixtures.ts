import { join } from 'path'

export const singleArtboardSketchFileFixture = {
  filename: join(__dirname, 'zluta.sketch'),
  bitmapCount: 0,
  artboards: [
    {
      id: '282A5FB7-4D38-4B5A-BE2B-25BF070B4C6E',
      name: 'Artboard',
      width: 575,
      height: 543,
    },
  ],
}

export const multiArtboardSketchFileFixture = {
  filename: join(__dirname, 'oval.sketch'),
  bitmapCount: 2,
  artboards: [
    {
      id: '371599FF-B815-4C85-93A8-B30C34A02396',
      name: 'c',
      width: 414,
      height: 354,
    },
    {
      id: '494D4863-F244-4115-9C5E-E6737C1F7CAA',
      name: 'd',
      width: 414,
      height: 354,
    },
    {
      id: '1E727EAE-7CC7-4190-9B3E-6B8C4EED9CDA',
      name: 'Oval',
      width: 284,
      height: 218,
      componentId: '52DEDA66-8AF5-49CF-AFCB-445119A06117',
    },
    {
      id: '53066AB7-02D2-4DC8-95C8-8DF7280B3923',
      name: 'Oval purple',
      width: 284,
      height: 218,
      componentId: '8EFF0957-EBD5-4B63-B9CE-72EF547D50B1',
    },
  ],
}

export const singleInlineArtboardPhotoshopFileFixture = {
  filename: join(__dirname, 'prerendered-with-doggo.psd'),
  bitmapCount: 3,
  prerenderedBitmapCount: 2,
  artboards: [
    {
      name: 'Artboard 1',
      width: 500,
      height: 400,
    },
  ],
}
