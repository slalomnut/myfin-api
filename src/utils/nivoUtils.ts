import { PaletteOptions } from '@mui/material/styles/createPalette';
import { LinearGradientDef, Theme as NivoTheme } from '@nivo/core';
import { ColorGradient } from '../consts';
import { cssGradients } from './gradientUtils.ts';

export function generateNivoTheme(
  _mode: 'light' | 'dark',
  palette: PaletteOptions,
): NivoTheme {
  return {
    text: {
      fontSize: 11,
      fill: palette.text?.primary,
      outlineWidth: 0,
      outlineColor: 'transparent',
    },
    tooltip: {
      container: {
        background: '#ffffff',
        color: '#333333',
        fontSize: 12,
      },
    },
    grid: {
      line: {
        stroke: palette.background?.default,
        strokeWidth: 0.2,
      },
    },
  };
}

const createNivoGradientObject = (
  id: string,
  gradients: {
    offset: number;
    color: string;
  }[],
): LinearGradientDef => ({
  id,
  type: 'linearGradient',
  colors: gradients,
});

export const nivoGradients = {
  [ColorGradient.Red]: createNivoGradientObject(ColorGradient.Red, [
    { offset: 0, color: '#ff5252' },
    { offset: 45, color: '#f48fb1' },
  ]),
  [ColorGradient.Blue]: createNivoGradientObject(ColorGradient.Blue, [
    { offset: 0, color: '#0288d1' },
    { offset: 45, color: '#26c6da' },
  ]),
  [ColorGradient.Green]: createNivoGradientObject(ColorGradient.Green, [
    { offset: 0, color: '#43a047' },
    { offset: 45, color: '#1de9b6' },
  ]),
  [ColorGradient.Orange]: createNivoGradientObject(ColorGradient.Orange, [
    { offset: 0, color: '#ff6f00' },
    { offset: 45, color: '#ffca28' },
  ]),
  [ColorGradient.DarkGray]: createNivoGradientObject(ColorGradient.DarkGray, [
    { offset: 0, color: '#424242' },
    { offset: 45, color: '#757575' },
  ]),
  [ColorGradient.LightGray]: createNivoGradientObject(ColorGradient.LightGray, [
    { offset: 0, color: '#797979' },
    { offset: 45, color: '#b9b7b7' },
  ]),
  [ColorGradient.Purple]: createNivoGradientObject(ColorGradient.Purple, [
    { offset: 0, color: '#7b1fa2' },
    { offset: 45, color: '#ba68c8' },
  ]),
  [ColorGradient.Pink]: createNivoGradientObject(ColorGradient.Pink, [
    { offset: 0, color: '#d81b60' },
    { offset: 45, color: '#f06292' },
  ]),
  [ColorGradient.DarkBlue]: createNivoGradientObject(ColorGradient.DarkBlue, [
    { offset: 0, color: '#1a237e' },
    { offset: 45, color: '#3949ab' },
  ]),
  [ColorGradient.Brown]: createNivoGradientObject(ColorGradient.Brown, [
    { offset: 0, color: '#5d4037' },
    { offset: 45, color: '#8d6e63' },
  ]),
  [ColorGradient.LightGreen]: createNivoGradientObject(
    ColorGradient.LightGreen,
    [
      { offset: 0, color: '#689f38' },
      { offset: 45, color: '#aed581' },
    ],
  ),
  [ColorGradient.DarkRed]: createNivoGradientObject(ColorGradient.DarkRed, [
    { offset: 0, color: '#b71c1c' },
    { offset: 45, color: '#e57373' },
  ]),
  [ColorGradient.Yellow]: createNivoGradientObject(ColorGradient.Yellow, [
    { offset: 0, color: '#fdd835' },
    { offset: 45, color: '#fff176' },
  ]),
  [ColorGradient.Roseanna]: createNivoGradientObject(ColorGradient.Roseanna, [
    { offset: 0, color: '#ffafbd' },
    { offset: 45, color: '#ffc3a0' },
  ]),
  [ColorGradient.Mauve]: createNivoGradientObject(ColorGradient.Mauve, [
    { offset: 0, color: '#42275a' },
    { offset: 45, color: '#734b6d' },
  ]),
  [ColorGradient.Lush]: createNivoGradientObject(ColorGradient.Lush, [
    { offset: 0, color: '#56ab2f' },
    { offset: 45, color: '#a8e063' },
  ]),
  [ColorGradient.PaleWood]: createNivoGradientObject(ColorGradient.PaleWood, [
    { offset: 0, color: '#eacda3' },
    { offset: 45, color: '#d6ae7b' },
  ]),
  [ColorGradient.Aubergine]: createNivoGradientObject(ColorGradient.Aubergine, [
    { offset: 0, color: '#aa076b' },
    { offset: 45, color: '#61045f' },
  ]),
  [ColorGradient.OrangeCoral]: createNivoGradientObject(
    ColorGradient.OrangeCoral,
    [
      { offset: 0, color: '#ff9966' },
      { offset: 45, color: '#ff5e62' },
    ],
  ),
  [ColorGradient.Decent]: createNivoGradientObject(ColorGradient.Decent, [
    { offset: 0, color: '#4ca1af' },
    { offset: 45, color: '#c4e0e5' },
  ]),
  [ColorGradient.Dusk]: createNivoGradientObject(ColorGradient.Dusk, [
    { offset: 0, color: '#2c3e50' },
    { offset: 45, color: '#bdc3c7' },
  ]),
  [ColorGradient.Dull]: createNivoGradientObject(ColorGradient.Dull, [
    { offset: 0, color: '#C9D6FF' },
    { offset: 45, color: '#E2E2E2' },
  ]),
  [ColorGradient.BlueColor]: createNivoGradientObject(ColorGradient.BlueColor, [
    { offset: 0, color: cssGradients[ColorGradient.BlueColor] },
    { offset: 45, color: cssGradients[ColorGradient.BlueColor] },
  ]),
  [ColorGradient.TealColor]: createNivoGradientObject(ColorGradient.TealColor, [
    { offset: 0, color: cssGradients[ColorGradient.TealColor] },
    { offset: 45, color: cssGradients[ColorGradient.TealColor] },
  ]),
  [ColorGradient.CoralColor]: createNivoGradientObject(
    ColorGradient.CoralColor,
    [
      { offset: 0, color: cssGradients[ColorGradient.CoralColor] },
      { offset: 45, color: cssGradients[ColorGradient.CoralColor] },
    ],
  ),
  [ColorGradient.YellowColor]: createNivoGradientObject(
    ColorGradient.YellowColor,
    [
      { offset: 0, color: cssGradients[ColorGradient.YellowColor] },
      { offset: 45, color: cssGradients[ColorGradient.YellowColor] },
    ],
  ),
  [ColorGradient.OrangeColor]: createNivoGradientObject(
    ColorGradient.OrangeColor,
    [
      { offset: 0, color: cssGradients[ColorGradient.OrangeColor] },
      { offset: 45, color: cssGradients[ColorGradient.OrangeColor] },
    ],
  ),
  [ColorGradient.AquaColor]: createNivoGradientObject(ColorGradient.AquaColor, [
    { offset: 0, color: cssGradients[ColorGradient.AquaColor] },
    { offset: 45, color: cssGradients[ColorGradient.AquaColor] },
  ]),
  [ColorGradient.PaleColor]: createNivoGradientObject(ColorGradient.PaleColor, [
    { offset: 0, color: cssGradients[ColorGradient.PaleColor] },
    { offset: 45, color: cssGradients[ColorGradient.PaleColor] },
  ]),
  [ColorGradient.GreenColor]: createNivoGradientObject(
    ColorGradient.GreenColor,
    [
      { offset: 0, color: cssGradients[ColorGradient.GreenColor] },
      { offset: 45, color: cssGradients[ColorGradient.GreenColor] },
    ],
  ),
  [ColorGradient.PinkColor]: createNivoGradientObject(ColorGradient.PinkColor, [
    { offset: 0, color: cssGradients[ColorGradient.PinkColor] },
    { offset: 45, color: cssGradients[ColorGradient.PinkColor] },
  ]),
  [ColorGradient.BrownColor]: createNivoGradientObject(
    ColorGradient.BrownColor,
    [
      { offset: 0, color: cssGradients[ColorGradient.BrownColor] },
      { offset: 45, color: cssGradients[ColorGradient.BrownColor] },
    ],
  ),
  [ColorGradient.RedColor]: createNivoGradientObject(ColorGradient.RedColor, [
    { offset: 0, color: cssGradients[ColorGradient.RedColor] },
    { offset: 45, color: cssGradients[ColorGradient.RedColor] },
  ]),
};

export const generateDefsForGradients = () => {
  return Object.values(nivoGradients);
};

const getRandomColorGradient = (): string => {
  const gradients = Object.values(ColorGradient);
  return gradients[Math.floor(Math.random() * gradients.length)];
};

export const generateFillArrayForGradients = (
  defaultMatchId = getRandomColorGradient,
) => {
  return [
    ...Object.keys(nivoGradients).map((gradientId) => ({
      // @ts-expect-error 'd' could assume different structural identities
      match: (d) =>
        d.data.color === gradientId ||
        (d.data.data && d.data.data.color == gradientId),
      id: gradientId,
    })),
    {
      // catch-all
      match: () => true,
      id: defaultMatchId as () => string,
    },
  ];
};
