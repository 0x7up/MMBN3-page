// Bulletin Board System (BBS) data model, authentic MMBN3 Blue threads, and localStorage persistence

export interface BBSThread {
  id: string;
  title: string;
  author: string;
  date: string;
  content: string;
  isCustom?: boolean;
}

const STORAGE_KEY = 'mmbn3_acdc_bbs_threads';

const DEFAULT_THREADS: BBSThread[] = [
  {
    id: 'bbs-1',
    title: 'Welcome to ACDC Sq!',
    author: 'NetWalker',
    date: '04/12',
    content: 'Welcome to the ACDC Square BBS! This board is for exchanging tips, NetBattle challenges, and chatter for all Navis visiting ACDC Square. Keep your security firewalls updated and enjoy your cyber stay!'
  },
  {
    id: 'bbs-2',
    title: 'GutsMan is invincible!',
    author: 'Dex',
    date: '04/14',
    content: 'My GutsMan can take down any virus in one hit! GutsHammer is the undisputed strongest battle chip! If anyone dares challenge us to a NetBattle, jack into Dex\'s PC in ACDC Town! Guts, guts, guts!'
  },
  {
    id: 'bbs-3',
    title: 'Virus Alert: ACDC 3',
    author: 'SciLab Official',
    date: '04/15',
    content: 'Attention all Navis: Aggressive Mettaur and Bunny virus variants have been spotted near the cyber gates of ACDC Sector 3. NetNavis are strongly advised to equip Wood and Elec chips before venturing beyond Square gates.'
  },
  {
    id: 'bbs-4',
    title: 'I am Rank #3...',
    author: 'Anonymous',
    date: '??/??',
    content: 'To the Navi hunting for ranking: If you desire the title of Rank #3, come alone to the bottom of the long slope in Undernet 4. Do not keep me waiting...'
  },
  {
    id: 'bbs-5',
    title: 'Chip Trader Secrets, huh!',
    author: 'Higsby',
    date: '04/18',
    content: 'Welcome, huh! Don\'t forget to trade in your duplicate battle chips at my chip shop in ACDC Town, huh! You might even obtain a rare MegaClass chip if you feed the 10-chip trader, huh!'
  },
  {
    id: 'bbs-6',
    title: 'Square Navigation Tips',
    author: 'Help Navi',
    date: '04/20',
    content: 'Tip: You can navigate the Square using [W][A][S][D] or [Arrow Keys], or Click / Tap anywhere on the platform to run there! Walk up to this terminal and press [Space] or [Enter] anytime to view or post BBS messages.'
  }
];

export class BBSManager {
  private threads: BBSThread[] = [];

  constructor() {
    this.loadThreads();
  }

  public getThreads(): BBSThread[] {
    return [...this.threads];
  }

  public getThreadById(id: string): BBSThread | undefined {
    return this.threads.find(t => t.id === id);
  }

  public addThread(title: string, author: string, content: string): BBSThread {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const newThread: BBSThread = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      author: author.trim() || 'Anonymous',
      date: `${mm}/${dd}`,
      content: content.trim(),
      isCustom: true
    };

    // Prepend user post so it appears prominently at top of board
    this.threads.unshift(newThread);
    this.saveThreads();
    return newThread;
  }

  private loadThreads(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const customThreads: BBSThread[] = JSON.parse(stored);
        this.threads = [...customThreads, ...DEFAULT_THREADS];
        return;
      }
    } catch (e) {
      console.warn('Failed to load BBS threads from localStorage:', e);
    }
    this.threads = [...DEFAULT_THREADS];
  }

  private saveThreads(): void {
    try {
      const customThreads = this.threads.filter(t => t.isCustom);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customThreads));
    } catch (e) {
      console.warn('Failed to save BBS threads to localStorage:', e);
    }
  }

  public resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.threads = [...DEFAULT_THREADS];
  }
}
