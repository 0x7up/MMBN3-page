// MMBN3 Map Data schemas, tile/prop definitions, and serialization utilities

export type ThemeType = 'acdc' | 'scilab' | 'yoka' | 'beach' | 'undernet' | 'secret';

export type FloorTileType =
  | 'floor'
  | 'acdc_floor'
  | 'scilab_floor'
  | 'yoka_floor'
  | 'beach_floor'
  | 'undernet_floor'
  | 'secret_floor'
  | 'special_ice'
  | 'special_cracked'
  | 'special_conveyor_e'
  | 'special_conveyor_w'
  | 'special_conveyor_s'
  | 'special_conveyor_n';

export type SkirtTileType =
  | 'skirt_sw'
  | 'skirt_se'
  | 'acdc_skirt_sw'
  | 'acdc_skirt_se'
  | 'scilab_skirt_sw'
  | 'scilab_skirt_se'
  | 'yoka_skirt_sw'
  | 'yoka_skirt_se'
  | 'beach_skirt_sw'
  | 'beach_skirt_se'
  | 'undernet_skirt_sw'
  | 'undernet_skirt_se'
  | 'secret_skirt_sw'
  | 'secret_skirt_se';

export type PropType =
  | 'prop_bbs'
  | 'prop_shop'
  | 'prop_warp_pad'
  | 'prop_beacon'
  | 'prop_mystery_green'
  | 'prop_mystery_blue'
  | 'prop_mystery_purple'
  | 'prop_mr_prog';

export interface PropConfig {
  name?: string;
  dialogue?: string[];
  bbsTitle?: string;
  reward?: {
    type: 'zenny' | 'chip';
    amount?: number;
    chipName?: string;
    name?: string;
    collected?: boolean;
  };
  isSolid?: boolean;
}

export interface PropInstance {
  id: string;
  type: PropType;
  gx: number;
  gy: number;
  config?: PropConfig;
}

export interface MMBNMapData {
  version: 1;
  id: string;
  name: string;
  theme: ThemeType;
  spawn: { gx: number; gy: number };
  // Floor layer: key is `${gx},${gy}`, value is FloorTileType
  tiles: Record<string, FloorTileType>;
  // Skirt layer: key is `${gx},${gy}_sw` or `${gx},${gy}_se`, value is SkirtTileType
  skirts: Record<string, SkirtTileType>;
  // Placed interactive props
  props: PropInstance[];
  // Metadata
  meta?: {
    author?: string;
    description?: string;
    createdAt?: string;
  };
}

export const THEMES: Record<ThemeType, { name: string; primaryColor: string; bgTone: string }> = {
  acdc: { name: 'ACDC Square', primaryColor: '#00f0d0', bgTone: '#202848' },
  scilab: { name: 'SciLab Square', primaryColor: '#2898f8', bgTone: '#081830' },
  yoka: { name: 'Yoka Square', primaryColor: '#38e078', bgTone: '#0a2818' },
  beach: { name: 'Beach Square', primaryColor: '#f8d030', bgTone: '#28200a' },
  undernet: { name: 'Under Square', primaryColor: '#b040f8', bgTone: '#180828' },
  secret: { name: 'Secret Area', primaryColor: '#00ffa0', bgTone: '#04100c' }
};

export function createEmptyMap(id: string, name: string, theme: ThemeType = 'acdc'): MMBNMapData {
  return {
    version: 1,
    id,
    name,
    theme,
    spawn: { gx: 3, gy: 3 },
    tiles: {},
    skirts: {},
    props: [],
    meta: {
      author: '0x7up',
      createdAt: new Date().toISOString()
    }
  };
}

export function exportMapToJson(map: MMBNMapData): string {
  return JSON.stringify(map, null, 2);
}

export function importMapFromJson(jsonStr: string): MMBNMapData {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid map data format');
    }
    if (!data.tiles || typeof data.tiles !== 'object') {
      throw new Error('Map is missing tiles dictionary');
    }
    if (!data.theme || !THEMES[data.theme as ThemeType]) {
      data.theme = 'acdc';
    }
    if (!data.spawn || typeof data.spawn.gx !== 'number' || typeof data.spawn.gy !== 'number') {
      data.spawn = { gx: 3, gy: 3 };
    }
    if (!Array.isArray(data.props)) {
      data.props = [];
    }
    if (!data.skirts || typeof data.skirts !== 'object') {
      data.skirts = {};
    }
    data.version = 1;
    return data as MMBNMapData;
  } catch (err: any) {
    throw new Error(`Failed to import map: ${err.message}`);
  }
}
