// MMBN3 Map Editor UI Toolbar, Palette Drawer, Modals, and Import/Export Handlers

import { MapEditor, EditorTool, PrefabType } from './MapEditor';
import { CustomMap } from '../world/CustomMap';
import { FloorTileType, PropType, PropInstance, exportMapToJson, importMapFromJson } from '../world/MapData';
import { AudioManager } from '../audio/AudioManager';

export class EditorUI {
  private editor: MapEditor;
  private map: CustomMap;
  private audio: AudioManager;

  private topBarEl!: HTMLElement;
  private paletteDrawerEl!: HTMLElement;
  private modalContainerEl!: HTMLElement;
  private dialogBoxEl!: HTMLElement;

  private onMapChangedCallback: (() => void) | null = null;
  private onModeChangedCallback: ((isEdit: boolean) => void) | null = null;

  constructor(editor: MapEditor, map: CustomMap, audio: AudioManager) {
    this.editor = editor;
    this.map = map;
    this.audio = audio;

    this.createUIElements();
    this.bindEvents();
    this.updateActiveUIState();

    // Link prop inspector callback
    this.editor.onOpenPropInspector = (prop: PropInstance) => {
      this.openPropInspector(prop);
    };
  }

  public setOnMapChanged(cb: () => void): void {
    this.onMapChangedCallback = cb;
  }

  public setOnModeChanged(cb: (isEdit: boolean) => void): void {
    this.onModeChangedCallback = cb;
  }

  private createUIElements(): void {
    // 1. Top Editor Toolbar
    this.topBarEl = document.createElement('div');
    this.topBarEl.id = 'editor-top-bar';
    this.topBarEl.className = 'editor-top-bar';
    this.topBarEl.innerHTML = `
      <div class="editor-bar-left">
        <button id="btn-mode-toggle" class="editor-mode-btn play-mode">
          <span class="mode-indicator"></span>
          <span id="mode-label">PLAY MODE</span>
        </button>
        <div class="editor-map-select-group">
          <label for="map-selector" class="editor-label">MAP:</label>
          <select id="map-selector" class="editor-select">
            <option value="acdc_square">ACDC Square</option>
            <option value="scilab_square">SciLab Square</option>
            <option value="yoka_square">Yoka Square</option>
            <option value="beach_square">Beach Square</option>
            <option value="under_square">Under Square</option>
            <option value="secret_area">Secret Area</option>
          </select>
        </div>
      </div>

      <div class="editor-bar-center" id="editor-tools-group" style="display: none;">
        <button class="tool-btn active" data-tool="brush" title="Pencil / Floor Brush (B)">✏️ BRUSH</button>
        <button class="tool-btn" data-tool="eraser" title="Eraser (E)">🧹 ERASE</button>
        <button class="tool-btn" data-tool="bucket" title="Bucket Flood Fill (F)">🪣 FILL</button>
        <button class="tool-btn" data-tool="prefab" title="Prefab Stamps (P)">🧩 PREFAB</button>
        <button class="tool-btn" data-tool="prop" title="Props & NPCs (O)">💎 PROP</button>
        <div class="tool-separator"></div>
        <button id="btn-undo" class="tool-btn icon-only" title="Undo (Ctrl+Z)">↩️</button>
        <button id="btn-redo" class="tool-btn icon-only" title="Redo (Ctrl+Y)">↪️</button>
      </div>

      <div class="editor-bar-right">
        <button id="btn-export-json" class="editor-action-btn" title="Download Map JSON">💾 EXPORT</button>
        <button id="btn-import-json" class="editor-action-btn" title="Import Map JSON">📁 IMPORT</button>
        <button id="btn-reset-map" class="editor-action-btn danger" title="Reset this template to default">🔄 RESET</button>
        <button id="btn-clear-map" class="editor-action-btn danger" title="Clear entire map" style="display: none;">🗑️ CLEAR</button>
        <input type="file" id="file-import-input" accept=".json" style="display: none;" />
      </div>
    `;
    document.body.appendChild(this.topBarEl);

    // 2. Bottom / Side Palette Drawer
    this.paletteDrawerEl = document.createElement('div');
    this.paletteDrawerEl.id = 'editor-palette-drawer';
    this.paletteDrawerEl.className = 'editor-palette-drawer hidden';
    this.paletteDrawerEl.innerHTML = `
      <div class="palette-header">
        <div class="palette-tabs">
          <button class="tab-btn active" data-tab="floors">FLOORS</button>
          <button class="tab-btn" data-tab="special">SPECIAL</button>
          <button class="tab-btn" data-tab="prefabs">PREFABS</button>
          <button class="tab-btn" data-tab="props">PROPS & NPCS</button>
        </div>
        <button id="btn-close-palette" class="palette-close-btn">✕</button>
      </div>

      <div class="palette-content">
        <!-- Floors Tab -->
        <div class="tab-pane active" id="pane-floors">
          <div class="palette-grid">
            <div class="palette-item active" data-floor="floor" title="Current Area Floor">
              <img src="/assets/tilesets/acdc_floor.png" alt="Theme Floor" />
              <span>Theme Floor</span>
            </div>
            <div class="palette-item" data-floor="acdc_floor" title="ACDC Circuit">
              <img src="/assets/tilesets/acdc_floor.png" alt="ACDC" />
              <span>ACDC</span>
            </div>
            <div class="palette-item" data-floor="scilab_floor" title="SciLab Circuit">
              <img src="/assets/tilesets/scilab_floor.png" alt="SciLab" />
              <span>SciLab</span>
            </div>
            <div class="palette-item" data-floor="yoka_floor" title="Yoka Bamboo Circuit">
              <img src="/assets/tilesets/yoka_floor.png" alt="Yoka" />
              <span>Yoka</span>
            </div>
            <div class="palette-item" data-floor="beach_floor" title="Beach Circuit">
              <img src="/assets/tilesets/beach_floor.png" alt="Beach" />
              <span>Beach</span>
            </div>
            <div class="palette-item" data-floor="undernet_floor" title="Undernet Circuit">
              <img src="/assets/tilesets/undernet_floor.png" alt="Undernet" />
              <span>Undernet</span>
            </div>
            <div class="palette-item" data-floor="secret_floor" title="Secret Area Circuit">
              <img src="/assets/tilesets/secret_floor.png" alt="Secret" />
              <span>Secret</span>
            </div>
          </div>
        </div>

        <!-- Special Tiles Tab -->
        <div class="tab-pane" id="pane-special">
          <div class="palette-grid">
            <div class="palette-item" data-floor="special_ice" title="Ice Panel (Frictionless Slide)">
              <img src="/assets/tilesets/special_ice.png" alt="Ice" />
              <span>Ice Slide</span>
            </div>
            <div class="palette-item" data-floor="special_cracked" title="Cracked Panel">
              <img src="/assets/tilesets/special_cracked.png" alt="Cracked" />
              <span>Cracked</span>
            </div>
            <div class="palette-item" data-floor="special_conveyor_e" title="Conveyor East ➡️">
              <img src="/assets/tilesets/special_conveyor_e.png" alt="Conveyor E" />
              <span>Conveyor ➡️</span>
            </div>
            <div class="palette-item" data-floor="special_conveyor_w" title="Conveyor West ⬅️">
              <img src="/assets/tilesets/special_conveyor_w.png" alt="Conveyor W" />
              <span>Conveyor ⬅️</span>
            </div>
            <div class="palette-item" data-floor="special_conveyor_s" title="Conveyor South ⬇️">
              <img src="/assets/tilesets/special_conveyor_s.png" alt="Conveyor S" />
              <span>Conveyor ⬇️</span>
            </div>
            <div class="palette-item" data-floor="special_conveyor_n" title="Conveyor North ⬆️">
              <img src="/assets/tilesets/special_conveyor_n.png" alt="Conveyor N" />
              <span>Conveyor ⬆️</span>
            </div>
          </div>
        </div>

        <!-- Prefabs Tab -->
        <div class="tab-pane" id="pane-prefabs">
          <div class="palette-grid">
            <div class="palette-item active" data-prefab="plaza_7x7" title="7x7 Plaza">
              <div class="prefab-preview-box">7×7</div>
              <span>7×7 Plaza</span>
            </div>
            <div class="palette-item" data-prefab="island_3x3" title="3x3 Island">
              <div class="prefab-preview-box">3×3</div>
              <span>3×3 Island</span>
            </div>
            <div class="palette-item" data-prefab="bridge_h_4x1" title="4x1 Horizontal Bridge">
              <div class="prefab-preview-box">4×1</div>
              <span>4×1 Bridge</span>
            </div>
            <div class="palette-item" data-prefab="bridge_v_1x4" title="1x4 Vertical Bridge">
              <div class="prefab-preview-box">1×4</div>
              <span>1×4 Bridge</span>
            </div>
            <div class="palette-item" data-prefab="warp_island" title="3x3 Warp Pad Platform">
              <div class="prefab-preview-box">WARP</div>
              <span>Warp Island</span>
            </div>
            <div class="palette-item" data-prefab="conveyor_loop" title="3x3 Conveyor Belt Loop">
              <div class="prefab-preview-box">LOOP</div>
              <span>Conveyor Loop</span>
            </div>
          </div>
        </div>

        <!-- Props Tab -->
        <div class="tab-pane" id="pane-props">
          <div class="palette-grid">
            <div class="palette-item active" data-prop="prop_mr_prog" title="Mr. Prog NPC (Custom Dialogue)">
              <img src="/assets/tilesets/prop_mr_prog.png" alt="Mr Prog" />
              <span>Mr. Prog</span>
            </div>
            <div class="palette-item" data-prop="prop_bbs" title="BBS Terminal">
              <img src="/assets/tilesets/prop_bbs.png" alt="BBS" />
              <span>BBS Screen</span>
            </div>
            <div class="palette-item" data-prop="prop_shop" title="NetMerchant Counter">
              <img src="/assets/tilesets/prop_shop.png" alt="Shop" />
              <span>Shop Counter</span>
            </div>
            <div class="palette-item" data-prop="prop_warp_pad" title="Warp Portal Pad">
              <img src="/assets/tilesets/prop_warp_pad.png" alt="Warp Pad" />
              <span>Warp Pad</span>
            </div>
            <div class="palette-item" data-prop="prop_beacon" title="Core Monolith / Beacon">
              <img src="/assets/tilesets/prop_beacon.png" alt="Beacon" />
              <span>Area Beacon</span>
            </div>
            <div class="palette-item" data-prop="prop_mystery_green" title="Green Mystery Data (Zenny)">
              <img src="/assets/tilesets/prop_mystery_green.png" alt="Green Data" />
              <span>Green Data</span>
            </div>
            <div class="palette-item" data-prop="prop_mystery_blue" title="Blue Mystery Data (Chip)">
              <img src="/assets/tilesets/prop_mystery_blue.png" alt="Blue Data" />
              <span>Blue Data</span>
            </div>
            <div class="palette-item" data-prop="prop_mystery_purple" title="Purple Mystery Data (Rare)">
              <img src="/assets/tilesets/prop_mystery_purple.png" alt="Purple Data" />
              <span>Purple Data</span>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.paletteDrawerEl);

    // 3. Prop Inspector Modal
    this.modalContainerEl = document.createElement('div');
    this.modalContainerEl.id = 'prop-inspector-modal';
    this.modalContainerEl.className = 'editor-modal hidden';
    document.body.appendChild(this.modalContainerEl);

    // 4. Overworld NPC Dialogue Box
    this.dialogBoxEl = document.createElement('div');
    this.dialogBoxEl.id = 'overworld-dialog-box';
    this.dialogBoxEl.className = 'overworld-dialog-box hidden';
    this.dialogBoxEl.innerHTML = `
      <div class="dialog-frame">
        <div class="dialog-speaker-name" id="dialog-speaker-name">MR. PROG</div>
        <div class="dialog-text" id="dialog-text">Beep boop!</div>
        <div class="dialog-prompt">[SPACE / ENTER / CLICK]</div>
      </div>
    `;
    document.body.appendChild(this.dialogBoxEl);
  }

  private bindEvents(): void {
    // Mode Toggle Button
    const modeBtn = document.getElementById('btn-mode-toggle')!;
    modeBtn.addEventListener('click', () => {
      const isEdit = this.editor.toggleMode();
      this.updateActiveUIState();
      if (this.onModeChangedCallback) {
        this.onModeChangedCallback(isEdit);
      }
    });

    // Map Selector
    const mapSelect = document.getElementById('map-selector') as HTMLSelectElement;
    mapSelect.addEventListener('change', () => {
      this.map.switchMap(mapSelect.value);
      this.audio.playSelect();
      if (this.onMapChangedCallback) {
        this.onMapChangedCallback();
      }
    });

    // Tool Buttons
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = (e.currentTarget as HTMLElement).dataset.tool as EditorTool;
        this.editor.activeTool = tool;
        toolBtns.forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        // Automatically switch drawer tab to match tool
        if (tool === 'brush') this.switchDrawerTab('floors');
        else if (tool === 'prefab') this.switchDrawerTab('prefabs');
        else if (tool === 'prop') this.switchDrawerTab('props');

        this.paletteDrawerEl.classList.remove('hidden');
        this.audio.playSelect();
      });
    });

    // Undo / Redo
    document.getElementById('btn-undo')!.addEventListener('click', () => {
      if (this.editor.undo()) {
        this.audio.playBip();
        if (this.onMapChangedCallback) this.onMapChangedCallback();
      }
    });

    document.getElementById('btn-redo')!.addEventListener('click', () => {
      if (this.editor.redo()) {
        this.audio.playBip();
        if (this.onMapChangedCallback) this.onMapChangedCallback();
      }
    });

    // Export JSON
    document.getElementById('btn-export-json')!.addEventListener('click', () => {
      this.exportMapFile();
    });

    // Import JSON
    const fileInput = document.getElementById('file-import-input') as HTMLInputElement;
    document.getElementById('btn-import-json')!.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const content = evt.target?.result as string;
            const imported = importMapFromJson(content);
            this.map.setMapData(imported);
            this.map.updateSkirts();
            mapSelect.value = imported.theme ? `${imported.theme}_square` : 'acdc_square';
            this.audio.playDecision();
            if (this.onMapChangedCallback) this.onMapChangedCallback();
          } catch (err: any) {
            alert(`Error importing map: ${err.message}`);
          }
        };
        reader.readAsText(file);
      }
      fileInput.value = '';
    });

    // Reset Map
    document.getElementById('btn-reset-map')!.addEventListener('click', () => {
      if (confirm(`Reset "${this.map.data.name}" back to original default layout?`)) {
        this.map.resetToDefault();
        this.audio.playBip();
        if (this.onMapChangedCallback) this.onMapChangedCallback();
      }
    });

    // Clear Map
    document.getElementById('btn-clear-map')!.addEventListener('click', () => {
      if (confirm(`Wipe all tiles and start a blank custom canvas?`)) {
        this.editor.clearAllTiles();
        this.audio.playBip();
        if (this.onMapChangedCallback) this.onMapChangedCallback();
      }
    });

    // Drawer Close Button
    document.getElementById('btn-close-palette')!.addEventListener('click', () => {
      this.paletteDrawerEl.classList.add('hidden');
    });

    // Drawer Tabs
    const tabBtns = document.querySelectorAll('.palette-tabs .tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = (e.currentTarget as HTMLElement).dataset.tab!;
        this.switchDrawerTab(targetTab);
      });
    });

    // Palette Items - Floors & Special
    const floorItems = document.querySelectorAll('.palette-item[data-floor]');
    floorItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const floor = (e.currentTarget as HTMLElement).dataset.floor as FloorTileType;
        this.editor.selectedFloor = floor;
        this.editor.activeTool = 'brush';
        floorItems.forEach(i => i.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.updateToolButtons();
        this.audio.playSelect();
      });
    });

    // Palette Items - Prefabs
    const prefabItems = document.querySelectorAll('.palette-item[data-prefab]');
    prefabItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const prefab = (e.currentTarget as HTMLElement).dataset.prefab as PrefabType;
        this.editor.selectedPrefab = prefab;
        this.editor.activeTool = 'prefab';
        prefabItems.forEach(i => i.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.updateToolButtons();
        this.audio.playSelect();
      });
    });

    // Palette Items - Props
    const propItems = document.querySelectorAll('.palette-item[data-prop]');
    propItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const prop = (e.currentTarget as HTMLElement).dataset.prop as PropType;
        this.editor.selectedProp = prop;
        this.editor.activeTool = 'prop';
        propItems.forEach(i => i.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.updateToolButtons();
        this.audio.playSelect();
      });
    });
  }

  private switchDrawerTab(tabName: string): void {
    const tabBtns = document.querySelectorAll('.palette-tabs .tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabName);
    });

    panes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabName}`);
    });
  }

  private updateToolButtons(): void {
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tool === this.editor.activeTool);
    });
  }

  public updateActiveUIState(): void {
    const isEdit = this.editor.isEditMode;
    const modeBtn = document.getElementById('btn-mode-toggle')!;
    const modeLabel = document.getElementById('mode-label')!;
    const toolsGroup = document.getElementById('editor-tools-group')!;
    const clearBtn = document.getElementById('btn-clear-map')!;

    if (isEdit) {
      modeBtn.className = 'editor-mode-btn edit-mode';
      modeLabel.textContent = 'EDIT MODE';
      toolsGroup.style.display = 'flex';
      clearBtn.style.display = 'block';
      this.paletteDrawerEl.classList.remove('hidden');
    } else {
      modeBtn.className = 'editor-mode-btn play-mode';
      modeLabel.textContent = 'PLAY MODE';
      toolsGroup.style.display = 'none';
      clearBtn.style.display = 'none';
      this.paletteDrawerEl.classList.add('hidden');
    }

    // Update map selector value
    const mapSelect = document.getElementById('map-selector') as HTMLSelectElement;
    if (mapSelect && this.map.data.id) {
      mapSelect.value = this.map.data.id;
    }
  }

  private exportMapFile(): void {
    const json = exportMapToJson(this.map.data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.map.data.id || 'custom_map'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.audio.playDecision();
  }

  public openPropInspector(prop: PropInstance): void {
    const modal = this.modalContainerEl;
    modal.className = 'editor-modal visible';

    const isNPC = prop.type === 'prop_mr_prog';
    const isBBS = prop.type === 'prop_bbs';
    const isMystery = prop.type.startsWith('prop_mystery_');

    const curName = prop.config?.name || prop.type;
    const curDialogue = (prop.config?.dialogue || []).join('\n');
    const curBBSTitle = prop.config?.bbsTitle || '';
    const isSolid = prop.config?.isSolid ?? true;

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">CONFIGURE PROP // ${prop.type.toUpperCase()}</span>
          <button class="modal-close-btn" id="modal-close-x">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name / Label:</label>
            <input type="text" id="prop-input-name" class="modal-input" value="${curName}" />
          </div>

          <div class="form-group">
            <label>Grid Location:</label>
            <div class="modal-readonly-val">gx: ${prop.gx}, gy: ${prop.gy}</div>
          </div>

          ${
            isNPC
              ? `
            <div class="form-group">
              <label>NPC Dialogue (One line per message):</label>
              <textarea id="prop-input-dialogue" class="modal-textarea" rows="4">${curDialogue}</textarea>
            </div>
          `
              : ''
          }

          ${
            isBBS
              ? `
            <div class="form-group">
              <label>BBS Board Title:</label>
              <input type="text" id="prop-input-bbs-title" class="modal-input" value="${curBBSTitle}" />
            </div>
          `
              : ''
          }

          ${
            isMystery
              ? `
            <div class="form-group">
              <label>Mystery Data Reward:</label>
              <div class="modal-readonly-val">${prop.config?.reward?.name || 'Random Zenny / Chip'}</div>
            </div>
          `
              : ''
          }

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" id="prop-input-solid" ${isSolid ? 'checked' : ''} />
              Solid Collision (Blocks MegaMan)
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="editor-action-btn danger" id="modal-btn-delete">🗑️ DELETE PROP</button>
          <button class="editor-action-btn primary" id="modal-btn-save">💾 SAVE</button>
        </div>
      </div>
    `;

    // Bind modal actions
    document.getElementById('modal-close-x')!.addEventListener('click', () => {
      modal.className = 'editor-modal hidden';
    });

    document.getElementById('modal-btn-delete')!.addEventListener('click', () => {
      this.editor.deleteProp(prop.id);
      modal.className = 'editor-modal hidden';
      this.audio.playBip();
      if (this.onMapChangedCallback) this.onMapChangedCallback();
    });

    document.getElementById('modal-btn-save')!.addEventListener('click', () => {
      const nameInput = document.getElementById('prop-input-name') as HTMLInputElement;
      const solidInput = document.getElementById('prop-input-solid') as HTMLInputElement;

      if (!prop.config) prop.config = {};
      prop.config.name = nameInput.value;
      prop.config.isSolid = solidInput.checked;

      if (isNPC) {
        const dialogInput = document.getElementById('prop-input-dialogue') as HTMLTextAreaElement;
        prop.config.dialogue = dialogInput.value.split('\n').filter(s => s.trim().length > 0);
      }

      if (isBBS) {
        const bbsInput = document.getElementById('prop-input-bbs-title') as HTMLInputElement;
        prop.config.bbsTitle = bbsInput.value;
      }

      this.map.saveCurrentMap();
      modal.className = 'editor-modal hidden';
      this.audio.playDecision();
      if (this.onMapChangedCallback) this.onMapChangedCallback();
    });
  }

  // NPC Dialogue presentation in Play Mode
  public showNPCDialog(speaker: string, lines: string[], onComplete?: () => void): void {
    if (!lines || lines.length === 0) return;

    const box = this.dialogBoxEl;
    const nameEl = document.getElementById('dialog-speaker-name')!;
    const textEl = document.getElementById('dialog-text')!;
    box.classList.remove('hidden');

    nameEl.textContent = speaker.toUpperCase();

    let currentLine = 0;
    const displayNextLine = () => {
      if (currentLine >= lines.length) {
        box.classList.add('hidden');
        if (onComplete) onComplete();
        return;
      }

      textEl.textContent = lines[currentLine];
      this.audio.playBip();
      currentLine++;
    };

    displayNextLine();

    const advanceHandler = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.key !== ' ' && e.key !== 'Enter' && e.key.toLowerCase() !== 'e') {
        return;
      }
      e.stopPropagation();
      displayNextLine();
      if (currentLine > lines.length) {
        window.removeEventListener('keydown', advanceHandler);
        box.removeEventListener('click', advanceHandler);
      }
    };

    window.addEventListener('keydown', advanceHandler);
    box.addEventListener('click', advanceHandler);
  }

  public showToastNotification(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'cyber-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }
}
