import struct
import json

def parse_midi(filename):
    with open(filename, 'rb') as f:
        data = f.read()
        
    pos = 0
    def read_str(n):
        nonlocal pos
        res = data[pos:pos+n]
        pos += n
        return res
        
    def read_short():
        nonlocal pos
        val = struct.unpack('>H', data[pos:pos+2])[0]
        pos += 2
        return val

    def read_long():
        nonlocal pos
        val = struct.unpack('>I', data[pos:pos+4])[0]
        pos += 4
        return val

    def read_varlen():
        nonlocal pos
        val = 0
        while True:
            b = data[pos]
            pos += 1
            val = (val << 7) | (b & 0x7F)
            if not (b & 0x80):
                break
        return val

    chunk_type = read_str(4)
    chunk_len = read_long()
    format_type = read_short()
    num_tracks = read_short()
    time_div = read_short()

    print(f"MIDI format {format_type}, tracks: {num_tracks}, time_div: {time_div}")

    tracks = []
    tempo = 500000 # default 120 bpm (microseconds per quarter note)
    
    events = [] # (tick, type, note, velocity, channel)
    
    for t_idx in range(num_tracks):
        chunk_type = read_str(4)
        chunk_len = read_long()
        end_pos = pos + chunk_len
        current_tick = 0
        running_status = 0
        
        while pos < end_pos:
            delta = read_varlen()
            current_tick += delta
            
            b = data[pos]
            if b >= 0x80:
                status = b
                pos += 1
                running_status = status
            else:
                status = running_status
                
            cmd = status >> 4
            ch = status & 0x0F
            
            if status == 0xFF: # Meta event
                meta_type = data[pos]
                pos += 1
                meta_len = read_varlen()
                meta_data = data[pos:pos+meta_len]
                pos += meta_len
                if meta_type == 0x51: # Set tempo
                    t_val = struct.unpack('>I', b'\x00' + meta_data)[0]
                    events.append((current_tick, 'tempo', t_val, 0, 0))
            elif status == 0xF0 or status == 0xF7: # SysEx
                sysex_len = read_varlen()
                pos += sysex_len
            elif cmd == 0x8: # Note off
                note = data[pos]
                vel = data[pos+1]
                pos += 2
                events.append((current_tick, 'note_off', note, vel, ch))
            elif cmd == 0x9: # Note on
                note = data[pos]
                vel = data[pos+1]
                pos += 2
                if vel == 0:
                    events.append((current_tick, 'note_off', note, 0, ch))
                else:
                    events.append((current_tick, 'note_on', note, vel, ch))
            elif cmd in [0xA, 0xB, 0xE]: # aftertouch, CC, pitch bend
                pos += 2
            elif cmd in [0xC, 0xD]: # program change, channel pressure
                pos += 1

    events.sort(key=lambda x: x[0])
    
    # Convert ticks to seconds
    seconds_per_tick = (tempo / 1000000.0) / time_div
    current_time = 0.0
    last_tick = 0
    
    active_notes = {} # (ch, note): (start_time, vel)
    notes_output = []
    
    for ev in events:
        tick = ev[0]
        dt = tick - last_tick
        current_time += dt * seconds_per_tick
        last_tick = tick
        
        ev_type = ev[1]
        if ev_type == 'tempo':
            tempo = ev[2]
            seconds_per_tick = (tempo / 1000000.0) / time_div
        elif ev_type == 'note_on':
            note, vel, ch = ev[2], ev[3], ev[4]
            active_notes[(ch, note)] = (current_time, vel)
        elif ev_type == 'note_off':
            note, ch = ev[2], ev[4]
            if (ch, note) in active_notes:
                start_t, vel = active_notes.pop((ch, note))
                dur = current_time - start_t
                if dur > 0.03:
                    notes_output.append({
                        't': round(start_t, 3),
                        'd': round(dur, 3),
                        'n': note,
                        'v': round(vel / 127.0, 2),
                        'c': ch
                    })

    # Find total loop duration
    total_dur = max(n['t'] + n['d'] for n in notes_output) if notes_output else 0
    print(f"Parsed {len(notes_output)} notes, total duration: {round(total_dur, 2)}s")
    
    with open('public/assets/bgm_notes.json', 'w') as f:
        json.dump({'duration': round(total_dur, 2), 'notes': notes_output}, f)
    print("Saved public/assets/bgm_notes.json")

parse_midi('public/assets/mmbn3_net_theme.mid')
