// Default MMBN3 map templates: ACDC Square, SciLab Square, Yoka Square, Beach Square, Under Square, Secret Area

import { MMBNMapData, ThemeType, FloorTileType, SkirtTileType, PropInstance } from './MapData';

/**
 * Automatically computes 3D perimeter skirts for all exposed edges
 */
export function generateSkirtsForTiles(
  tiles: Record<string, FloorTileType>,
  theme: ThemeType
): Record<string, SkirtTileType> {
  const skirts: Record<string, SkirtTileType> = {};
  const swType: SkirtTileType = `${theme}_skirt_sw` as SkirtTileType;
  const seType: SkirtTileType = `${theme}_skirt_se` as SkirtTileType;

  for (const key of Object.keys(tiles)) {
    const [gxStr, gyStr] = key.split(',');
    const gx = parseInt(gxStr, 10);
    const gy = parseInt(gyStr, 10);

    // South-West edge (+gy neighbor)
    const swNeighbor = `${gx},${gy + 1}`;
    if (!tiles[swNeighbor]) {
      skirts[`${gx},${gy}_sw`] = swType;
    }

    // South-East edge (+gx neighbor)
    const seNeighbor = `${gx + 1},${gy}`;
    if (!tiles[seNeighbor]) {
      skirts[`${gx + 1},${gy}_se`] = seType;
    }
  }

  return skirts;
}

/**
 * Fills a rectangular isometric plaza [startX..startX+w-1, startY..startY+h-1]
 */
function fillRect(
  tiles: Record<string, FloorTileType>,
  startX: number,
  startY: number,
  w: number,
  h: number,
  tileType: FloorTileType
): void {
  for (let x = startX; x < startX + w; x++) {
    for (let y = startY; y < startY + h; y++) {
      tiles[`${x},${y}`] = tileType;
    }
  }
}

/**
 * 1. ACDC Square
 */
export function createACDCSquare(): MMBNMapData {
  const tiles: Record<string, FloorTileType> = {};

  // Main 7x7 Plaza
  fillRect(tiles, 0, 0, 7, 7, 'acdc_floor');

  // Upper Bridge to BBS platform
  tiles['6,-1'] = 'acdc_floor';
  tiles['7,-1'] = 'acdc_floor';
  tiles['7,-2'] = 'acdc_floor';
  tiles['8,-2'] = 'acdc_floor';

  // Upper BBS Platform (3x3)
  fillRect(tiles, 8, -5, 4, 3, 'acdc_floor');

  // Lower Bridge to Warp platform
  tiles['0,7'] = 'acdc_floor';
  tiles['-1,7'] = 'acdc_floor';
  tiles['-1,8'] = 'acdc_floor';
  tiles['-2,8'] = 'acdc_floor';

  // Lower Warp Platform (3x3)
  fillRect(tiles, -4, 8, 3, 3, 'acdc_floor');

  const skirts = generateSkirtsForTiles(tiles, 'acdc');

  const props: PropInstance[] = [
    {
      id: 'acdc-bbs',
      type: 'prop_bbs',
      gx: 9,
      gy: -5,
      config: {
        name: 'ACDC BBS',
        bbsTitle: 'ACDC SQUARE BULLETIN BOARD',
        isSolid: true
      }
    },
    {
      id: 'acdc-shop',
      type: 'prop_shop',
      gx: 0,
      gy: 5,
      config: {
        name: 'NetMerchant Counter',
        isSolid: true
      }
    },
    {
      id: 'acdc-warp',
      type: 'prop_warp_pad',
      gx: -3,
      gy: 9,
      config: {
        name: 'ACDC Warp Portal',
        isSolid: false
      }
    },
    {
      id: 'acdc-prog',
      type: 'prop_mr_prog',
      gx: 4,
      gy: 1,
      config: {
        name: 'Mr. Prog',
        dialogue: [
          'Welcome to ACDC Square!',
          'You can use the Map Builder to add tiles, conveyor belts, ice, and props!',
          'Click [EDIT MODE] above to start building.'
        ],
        isSolid: true
      }
    },
    {
      id: 'acdc-green-data',
      type: 'prop_mystery_green',
      gx: 6,
      gy: 6,
      config: {
        name: 'Mystery Data',
        reward: {
          type: 'zenny',
          amount: 800,
          name: '800 Zennys'
        },
        isSolid: false
      }
    }
  ];

  return {
    version: 1,
    id: 'acdc_square',
    name: 'ACDC Square',
    theme: 'acdc',
    spawn: { gx: 3, gy: 3 },
    tiles,
    skirts,
    props,
    meta: {
      author: '0x7up',
      description: 'The iconic cyber home square of Lan & MegaMan.EXE.'
    }
  };
}

/**
 * 2. SciLab Square
 */
export function createSciLabSquare(): MMBNMapData {
  const tiles: Record<string, FloorTileType> = {};

  // Main 8x8 SciLab Plaza
  fillRect(tiles, 0, 0, 8, 8, 'scilab_floor');

  // Outer conveyor track accelerating Navis
  for (let x = 1; x <= 6; x++) tiles[`${x},1`] = 'special_conveyor_e';
  for (let y = 1; y <= 6; y++) tiles[`6,${y}`] = 'special_conveyor_s';
  for (let x = 6; x >= 1; x--) tiles[`${x},6`] = 'special_conveyor_w';
  for (let y = 6; y >= 1; y--) tiles[`1,${y}`] = 'special_conveyor_n';

  // North-East observation deck
  fillRect(tiles, 8, 1, 4, 3, 'scilab_floor');

  // South-West server room
  fillRect(tiles, -3, 4, 3, 4, 'scilab_floor');

  const skirts = generateSkirtsForTiles(tiles, 'scilab');

  const props: PropInstance[] = [
    {
      id: 'scilab-bbs',
      type: 'prop_bbs',
      gx: 10,
      gy: 1,
      config: {
        name: 'SciLab BBS',
        bbsTitle: 'SCILAB RESEARCH NETWORK',
        isSolid: true
      }
    },
    {
      id: 'scilab-beacon',
      type: 'prop_beacon',
      gx: 3,
      gy: 3,
      config: {
        name: 'SciLab Central Core',
        isSolid: true
      }
    },
    {
      id: 'scilab-prog',
      type: 'prop_mr_prog',
      gx: 5,
      gy: 4,
      config: {
        name: 'SciLab Maintenance Prog',
        dialogue: [
          'Beep boop! SciLab supercomputers are running at 99.9% quantum stability.',
          'Step on the green conveyor arrows to glide quickly across the laboratory floor!'
        ],
        isSolid: true
      }
    },
    {
      id: 'scilab-blue-data',
      type: 'prop_mystery_blue',
      gx: 10,
      gy: 3,
      config: {
        name: 'Blue Mystery Data',
        reward: {
          type: 'chip',
          chipName: 'Invis *',
          name: 'BattleChip: Invis *'
        },
        isSolid: false
      }
    }
  ];

  return {
    version: 1,
    id: 'scilab_square',
    name: 'SciLab Square',
    theme: 'scilab',
    spawn: { gx: 4, gy: 4 },
    tiles,
    skirts,
    props,
    meta: {
      author: '0x7up',
      description: 'Official Scientific Cyber Laboratories Net Hub.'
    }
  };
}

/**
 * 3. Yoka Square
 */
export function createYokaSquare(): MMBNMapData {
  const tiles: Record<string, FloorTileType> = {};

  // Serene Yoka Plaza
  fillRect(tiles, 0, 0, 6, 6, 'yoka_floor');

  // Garden stepping stones
  fillRect(tiles, 6, 2, 3, 2, 'yoka_floor');
  fillRect(tiles, 9, 0, 3, 4, 'yoka_floor');

  // Hot spring pavilion
  fillRect(tiles, -3, 1, 3, 3, 'yoka_floor');
  fillRect(tiles, 2, 6, 2, 3, 'yoka_floor');

  const skirts = generateSkirtsForTiles(tiles, 'yoka');

  const props: PropInstance[] = [
    {
      id: 'yoka-bbs',
      type: 'prop_bbs',
      gx: 10,
      gy: 0,
      config: {
        name: 'Yoka BBS',
        bbsTitle: 'YOKA INN & RESORT BOARD',
        isSolid: true
      }
    },
    {
      id: 'yoka-prog',
      type: 'prop_mr_prog',
      gx: 2,
      gy: 2,
      config: {
        name: 'Resort Prog',
        dialogue: [
          'Ahhh... The cyber hot springs are so relaxing!',
          'Yoka Square is famous for its peaceful scenery and traditional cyber gardens.'
        ],
        isSolid: true
      }
    },
    {
      id: 'yoka-green-data',
      type: 'prop_mystery_green',
      gx: -2,
      gy: 2,
      config: {
        name: 'Green Mystery Data',
        reward: {
          type: 'zenny',
          amount: 1200,
          name: '1200 Zennys'
        },
        isSolid: false
      }
    }
  ];

  return {
    version: 1,
    id: 'yoka_square',
    name: 'Yoka Square',
    theme: 'yoka',
    spawn: { gx: 3, gy: 3 },
    tiles,
    skirts,
    props,
    meta: {
      author: '0x7up',
      description: 'Tranquil cyber resort with hot spring pavilions.'
    }
  };
}

/**
 * 4. Beach Square
 */
export function createBeachSquare(): MMBNMapData {
  const tiles: Record<string, FloorTileType> = {};

  // Beach Plaza (sunlit amber)
  fillRect(tiles, 0, 0, 7, 7, 'beach_floor');

  // Coastal Ice Slide Challenge across the center
  tiles['3,1'] = 'special_ice';
  tiles['3,2'] = 'special_ice';
  tiles['3,3'] = 'special_ice';
  tiles['3,4'] = 'special_ice';
  tiles['3,5'] = 'special_ice';

  // Broadcast studio pier
  fillRect(tiles, 7, 3, 4, 3, 'beach_floor');

  // Ferry dock
  fillRect(tiles, -3, 2, 3, 3, 'beach_floor');

  const skirts = generateSkirtsForTiles(tiles, 'beach');

  const props: PropInstance[] = [
    {
      id: 'beach-bbs',
      type: 'prop_bbs',
      gx: 9,
      gy: 3,
      config: {
        name: 'Beach BBS',
        bbsTitle: 'DENCAST DNN NETWORK BOARD',
        isSolid: true
      }
    },
    {
      id: 'beach-prog',
      type: 'prop_mr_prog',
      gx: 1,
      gy: 3,
      config: {
        name: 'DNN Producer Prog',
        dialogue: [
          'Live on air in 3... 2... 1!',
          'Watch out for the ice panels in the center plaza—you will slide across them with zero friction!'
        ],
        isSolid: true
      }
    },
    {
      id: 'beach-blue-data',
      type: 'prop_mystery_blue',
      gx: -2,
      gy: 3,
      config: {
        name: 'Blue Mystery Data',
        reward: {
          type: 'chip',
          chipName: 'StepSwrd P',
          name: 'BattleChip: StepSwrd P'
        },
        isSolid: false
      }
    }
  ];

  return {
    version: 1,
    id: 'beach_square',
    name: 'Beach Square',
    theme: 'beach',
    spawn: { gx: 2, gy: 2 },
    tiles,
    skirts,
    props,
    meta: {
      author: '0x7up',
      description: 'Sunlit resort hub connecting DNN Television Studios.'
    }
  };
}

/**
 * 5. Under Square
 */
export function createUnderSquare(): MMBNMapData {
  const tiles: Record<string, FloorTileType> = {};

  // Forbidden Undernet Plaza (dark purple)
  fillRect(tiles, 0, 0, 7, 7, 'undernet_floor');

  // Dangerous cracked panels & traps
  tiles['2,2'] = 'special_cracked';
  tiles['4,2'] = 'special_cracked';
  tiles['2,4'] = 'special_cracked';
  tiles['4,4'] = 'special_cracked';

  // Perilous dark alleys
  fillRect(tiles, -3, 0, 3, 3, 'undernet_floor');
  fillRect(tiles, 7, 4, 3, 3, 'undernet_floor');

  const skirts = generateSkirtsForTiles(tiles, 'undernet');

  const props: PropInstance[] = [
    {
      id: 'under-bbs',
      type: 'prop_bbs',
      gx: 8,
      gy: 4,
      config: {
        name: 'Under BBS',
        bbsTitle: 'UNDERNET UNDERGROUND FORUM',
        isSolid: true
      }
    },
    {
      id: 'under-prog',
      type: 'prop_mr_prog',
      gx: 1,
      gy: 1,
      config: {
        name: 'Shady Prog',
        dialogue: [
          'Hehehe... You do not belong here, little boy in blue.',
          'Step carefully... The Undernet does not forgive mistakes.'
        ],
        isSolid: true
      }
    },
    {
      id: 'under-purple-data',
      type: 'prop_mystery_purple',
      gx: -2,
      gy: 1,
      config: {
        name: 'Purple Mystery Data',
        reward: {
          type: 'zenny',
          amount: 5000,
          name: '5,000 Zennys (Undernet Bounty)'
        },
        isSolid: false
      }
    }
  ];

  return {
    version: 1,
    id: 'under_square',
    name: 'Under Square',
    theme: 'undernet',
    spawn: { gx: 3, gy: 3 },
    tiles,
    skirts,
    props,
    meta: {
      author: '0x7up',
      description: 'The treacherous criminal underworld of the Net.'
    }
  };
}

/**
 * 6. Secret Area
 */
export function createSecretArea(): MMBNMapData {
  const tiles: Record<string, FloorTileType> = {};

  // Deep Matrix Monolith (cyan/black labyrinth)
  fillRect(tiles, 0, 0, 6, 6, 'secret_floor');

  // Ice stepping puzzle
  tiles['2,1'] = 'special_ice';
  tiles['3,1'] = 'special_ice';
  tiles['2,2'] = 'special_ice';
  tiles['3,2'] = 'special_ice';

  // High trials platform
  fillRect(tiles, 6, 2, 4, 3, 'secret_floor');

  const skirts = generateSkirtsForTiles(tiles, 'secret');

  const props: PropInstance[] = [
    {
      id: 'secret-beacon',
      type: 'prop_beacon',
      gx: 8,
      gy: 3,
      config: {
        name: 'Serenade Trial Monolith',
        isSolid: true
      }
    },
    {
      id: 'secret-bbs',
      type: 'prop_bbs',
      gx: 8,
      gy: 2,
      config: {
        name: 'Secret BBS',
        bbsTitle: 'AREA OF THE KING - SECRET BBS',
        isSolid: true
      }
    },
    {
      id: 'secret-prog',
      type: 'prop_mr_prog',
      gx: 1,
      gy: 3,
      config: {
        name: 'Guardian Prog',
        dialogue: [
          'Beyond lies the domain of Serenade...',
          'Only Navis with true heart and mastery over the Net may proceed.'
        ],
        isSolid: true
      }
    },
    {
      id: 'secret-blue-data',
      type: 'prop_mystery_blue',
      gx: 5,
      gy: 0,
      config: {
        name: 'Secret Mystery Data',
        reward: {
          type: 'chip',
          chipName: 'FolderBak *',
          name: 'GigaChip: FolderBak *'
        },
        isSolid: false
      }
    }
  ];

  return {
    version: 1,
    id: 'secret_area',
    name: 'Secret Area',
    theme: 'secret',
    spawn: { gx: 2, gy: 4 },
    tiles,
    skirts,
    props,
    meta: {
      author: '0x7up',
      description: 'Hidden end-game trials guarded by Lord Serenade.'
    }
  };
}

export const DEFAULT_MAP_FACTORIES: Record<string, () => MMBNMapData> = {
  acdc_square: createACDCSquare,
  scilab_square: createSciLabSquare,
  yoka_square: createYokaSquare,
  beach_square: createBeachSquare,
  under_square: createUnderSquare,
  secret_area: createSecretArea
};
