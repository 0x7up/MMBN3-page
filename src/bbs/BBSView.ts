// BBS Interactive View UI component styled with authentic Mega Man Battle Network aesthetic

import { BBSManager, BBSThread } from './BBSManager';
import { AudioManager } from '../audio/AudioManager';

export class BBSView {
  private container: HTMLDialogElement;
  private manager: BBSManager;
  private audio: AudioManager;

  private selectedIndex: number = 0;
  private currentView: 'list' | 'read' | 'compose' = 'list';
  private activeThread: BBSThread | null = null;
  private typewriterTimer: number | null = null;

  private onCloseCallback: () => void = () => {};

  constructor(manager: BBSManager, audio: AudioManager, onClose: () => void) {
    this.manager = manager;
    this.audio = audio;
    this.onCloseCallback = onClose;

    this.container = document.createElement('dialog');
    this.container.id = 'bbs-dialog';
    this.container.className = 'mmbn-dialog';
    document.body.appendChild(this.container);

    this.setupGlobalEvents();
  }

  public open(): void {
    this.audio.playBBSOpen();
    this.currentView = 'list';
    this.selectedIndex = 0;
    this.render();
    if (!this.container.open) {
      this.container.showModal();
    }
  }

  public close(): void {
    this.clearTypewriter();
    this.audio.playCancel();
    if (this.container.open) {
      this.container.close();
    }
    this.onCloseCallback();
  }

  public isOpen(): boolean {
    return this.container.open;
  }

  private setupGlobalEvents(): void {
    // Light dismiss / backdrop click
    this.container.addEventListener('click', (e) => {
      const rect = this.container.getBoundingClientRect();
      const inDialog =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inDialog) {
        this.close();
      }
    });

    // Keyboard navigation inside BBS
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;

      // Handle Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.currentView === 'read' || this.currentView === 'compose') {
          this.audio.playCancel();
          this.currentView = 'list';
          this.render();
        } else {
          this.close();
        }
        return;
      }

      if (this.currentView === 'list') {
        const threads = this.manager.getThreads();
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex - 1 + threads.length) % threads.length;
          this.audio.playCursor();
          this.updateCursorHighlight();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex + 1) % threads.length;
          this.audio.playCursor();
          this.updateCursorHighlight();
        } else if (e.key === 'Enter' || e.key === ' ') {
          // If not focused on an input
          if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.openThread(threads[this.selectedIndex]);
          }
        }
      }
    });
  }

  private clearTypewriter(): void {
    if (this.typewriterTimer) {
      window.clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private render(): void {
    this.clearTypewriter();

    if (this.currentView === 'list') {
      this.renderThreadList();
    } else if (this.currentView === 'read' && this.activeThread) {
      this.renderThreadDetail(this.activeThread);
    } else if (this.currentView === 'compose') {
      this.renderCompose();
    }
  }

  private renderThreadList(): void {
    const threads = this.manager.getThreads();

    this.container.innerHTML = `
      <div class="bbs-window">
        <!-- Header -->
        <div class="bbs-header">
          <div class="bbs-title-badge">
            <span class="bbs-icon">✦</span>
            <span class="bbs-title-text">ACDC SQUARE BBS</span>
          </div>
          <div class="bbs-header-actions">
            <button class="mmbn-btn btn-new-post" id="bbs-btn-compose">
              <span class="btn-glow"></span>+ NEW POST
            </button>
            <button class="mmbn-btn btn-close" id="bbs-btn-close">✕</button>
          </div>
        </div>

        <!-- Subheader instructions -->
        <div class="bbs-subbar">
          <span>SELECT A THREAD WITH [W/S] OR CLICK. [ENTER]: READ</span>
          <span>POSTS: ${threads.length}</span>
        </div>

        <!-- Thread list -->
        <div class="bbs-list" id="bbs-thread-container">
          ${threads.map((t, idx) => `
            <div class="bbs-item ${idx === this.selectedIndex ? 'selected' : ''} ${t.isCustom ? 'custom-post' : ''}" data-index="${idx}">
              <div class="bbs-item-cursor">${idx === this.selectedIndex ? '▶' : ''}</div>
              <div class="bbs-item-num">#${threads.length - idx}</div>
              <div class="bbs-item-title">${this.escapeHtml(t.title)}</div>
              <div class="bbs-item-author">${this.escapeHtml(t.author)}</div>
              <div class="bbs-item-date">${t.date}</div>
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div class="bbs-footer">
          <span class="bbs-footer-hint">[ESC] CLOSE BBS</span>
          <span class="bbs-network-status">CONNECTED: ACDC_NET_3</span>
        </div>
      </div>
    `;

    // Hook events
    document.getElementById('bbs-btn-close')?.addEventListener('click', () => this.close());
    document.getElementById('bbs-btn-compose')?.addEventListener('click', () => {
      this.audio.playConfirm();
      this.currentView = 'compose';
      this.render();
    });

    const items = this.container.querySelectorAll('.bbs-item');
    items.forEach((elem) => {
      elem.addEventListener('mouseenter', () => {
        const idx = parseInt(elem.getAttribute('data-index') || '0', 10);
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          this.audio.playCursor();
          this.updateCursorHighlight();
        }
      });
      elem.addEventListener('click', () => {
        const idx = parseInt(elem.getAttribute('data-index') || '0', 10);
        this.openThread(threads[idx]);
      });
    });
  }

  private updateCursorHighlight(): void {
    const items = this.container.querySelectorAll('.bbs-item');
    items.forEach((elem, idx) => {
      const cursor = elem.querySelector('.bbs-item-cursor');
      if (idx === this.selectedIndex) {
        elem.classList.add('selected');
        if (cursor) cursor.textContent = '▶';
        elem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        elem.classList.remove('selected');
        if (cursor) cursor.textContent = '';
      }
    });
  }

  private openThread(thread: BBSThread): void {
    this.audio.playConfirm();
    this.activeThread = thread;
    this.currentView = 'read';
    this.render();
  }

  private renderThreadDetail(thread: BBSThread): void {
    this.container.innerHTML = `
      <div class="bbs-window">
        <div class="bbs-header">
          <div class="bbs-title-badge">
            <span class="bbs-icon">✦</span>
            <span class="bbs-title-text">${this.escapeHtml(thread.title)}</span>
          </div>
          <button class="mmbn-btn btn-close" id="bbs-btn-back">✕ BACK</button>
        </div>

        <div class="bbs-meta-box">
          <div class="meta-field"><span class="meta-label">POSTER:</span> <span class="meta-val">${this.escapeHtml(thread.author)}</span></div>
          <div class="meta-field"><span class="meta-label">DATE:</span> <span class="meta-val">${thread.date}</span></div>
          <div class="meta-field"><span class="meta-label">STATUS:</span> <span class="meta-val">${thread.isCustom ? 'VISITOR POST' : 'OFFICIAL ARCHIVE'}</span></div>
        </div>

        <div class="bbs-body-box">
          <div class="bbs-typewriter-text" id="bbs-text-target"></div>
          <span class="bbs-prompt-blink">▼</span>
        </div>

        <div class="bbs-footer">
          <button class="mmbn-btn btn-action" id="bbs-btn-detail-back">← RETURN TO BOARD</button>
          <span class="bbs-footer-hint">[ESC] BACK</span>
        </div>
      </div>
    `;

    document.getElementById('bbs-btn-back')?.addEventListener('click', () => {
      this.audio.playCancel();
      this.currentView = 'list';
      this.render();
    });
    document.getElementById('bbs-btn-detail-back')?.addEventListener('click', () => {
      this.audio.playCancel();
      this.currentView = 'list';
      this.render();
    });

    // Typewriter effect
    const target = document.getElementById('bbs-text-target');
    if (!target) return;

    const fullText = thread.content;
    let charIdx = 0;
    this.clearTypewriter();

    this.typewriterTimer = window.setInterval(() => {
      if (charIdx < fullText.length) {
        target.textContent += fullText[charIdx];
        if (charIdx % 3 === 0 && fullText[charIdx] !== ' ') {
          this.audio.playTextBlip();
        }
        charIdx++;
      } else {
        this.clearTypewriter();
      }
    }, 24);
  }

  private renderCompose(): void {
    this.container.innerHTML = `
      <div class="bbs-window">
        <div class="bbs-header">
          <div class="bbs-title-badge">
            <span class="bbs-icon">✦</span>
            <span class="bbs-title-text">TRANSMIT NEW MESSAGE</span>
          </div>
          <button class="mmbn-btn btn-close" id="bbs-btn-compose-cancel">✕ CANCEL</button>
        </div>

        <form id="bbs-compose-form" class="bbs-compose-form">
          <div class="form-group">
            <label class="form-label">NAVI HANDLE (AUTHOR):</label>
            <input type="text" id="compose-author" class="mmbn-input" maxlength="20" placeholder="MegaMan.EXE" value="MegaMan.EXE" required />
          </div>

          <div class="form-group">
            <label class="form-label">SUBJECT TITLE:</label>
            <input type="text" id="compose-title" class="mmbn-input" maxlength="32" placeholder="e.g. NetBattle Ready!" required />
          </div>

          <div class="form-group">
            <label class="form-label">MESSAGE DATA:</label>
            <textarea id="compose-body" class="mmbn-textarea" rows="5" maxlength="280" placeholder="Type your message for the ACDC Square BBS..." required></textarea>
          </div>

          <div class="bbs-compose-actions">
            <button type="submit" class="mmbn-btn btn-submit">
              <span class="btn-glow"></span>TRANSMIT MESSAGE
            </button>
            <button type="button" class="mmbn-btn btn-cancel" id="bbs-btn-compose-back">
              CANCEL
            </button>
          </div>
        </form>

        <div class="bbs-footer">
          <span class="bbs-footer-hint">MESSAGES PERSIST IN LOCAL CYBER MEMORY</span>
        </div>
      </div>
    `;

    document.getElementById('bbs-btn-compose-cancel')?.addEventListener('click', () => {
      this.audio.playCancel();
      this.currentView = 'list';
      this.render();
    });
    document.getElementById('bbs-btn-compose-back')?.addEventListener('click', () => {
      this.audio.playCancel();
      this.currentView = 'list';
      this.render();
    });

    const form = document.getElementById('bbs-compose-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const authorInput = document.getElementById('compose-author') as HTMLInputElement;
      const titleInput = document.getElementById('compose-title') as HTMLInputElement;
      const bodyInput = document.getElementById('compose-body') as HTMLTextAreaElement;

      if (!titleInput.value.trim() || !bodyInput.value.trim()) return;

      this.manager.addThread(titleInput.value, authorInput.value, bodyInput.value);
      this.audio.playConfirm();
      this.currentView = 'list';
      this.selectedIndex = 0;
      this.render();
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
