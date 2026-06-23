export const quickQuoteDictionary = {
  productCategory: [
    { regex: /(tem nhãn|tem|decal|sticker)/i, value: 'DIGITAL_LABEL' }
  ],
  material: [
    { regex: /(nhựa sữa|decal sữa|decal nhựa sữa|pp sữa)/i, value: 'DECAL_MILKY' },
    { regex: /(nhựa trong|decal trong|decal nhựa trong|trong)/i, value: 'DECAL_CLEAR' },
    { regex: /(xi bạc|bạc|decal xi bạc)/i, value: 'SILVER' },
    { regex: /(kraft|decal kraft|giấy kraft)/i, value: 'KRAFT' },
    // Put decal giấy last so it doesn't override "decal nhựa trong" by just matching "decal"
    { regex: /(decal giấy|in decal giấy|giấy)/i, value: 'DECAL_PAPER' }
  ],
  lamination: [
    { regex: /(không cán|ko cán|không màng)/i, value: 'NONE' },
    { regex: /(cán mờ|màng mờ)/i, value: 'MATTE' },
    // Put cán bóng last to avoid partial matches
    { regex: /(cán bóng|màng bóng|cán cán bóng)/i, value: 'GLOSSY' }
  ],
  dieCut: [
    { regex: /(không bế|ko bế)/i, value: 'NONE' },
    { regex: /(bế thẳng|cắt thẳng)/i, value: 'STRAIGHT' },
    { regex: /(bế demi theo hình|bế theo hình|đemi theo hình|bế demi|đemi)/i, value: 'CUSTOM_SHAPE' }
  ],
  printSize: [
    { regex: /32\s*x\s*35/i, value: '32x35' },
    { regex: /32\s*x\s*43/i, value: '32x43' }
  ],
  machine: [
    { regex: /(graphtec)/i, value: 'Graphtec' },
    { regex: /(avitech)/i, value: 'Avitech' }
  ]
};
