// Lightweight date formatting in italiano, senza dipendere dal locale init di `intl`.

const _mesiBrevi = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
];

const _mesi = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const _giorniBrevi = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

/// "12 mag 2026"
String formatDateItShort(DateTime d) {
  return '${d.day} ${_mesiBrevi[d.month - 1]} ${d.year}';
}

/// "12 maggio 2026"
String formatDateItLong(DateTime d) {
  return '${d.day} ${_mesi[d.month - 1]} ${d.year}';
}

/// "lun 12 mag" (no anno)
String formatDateItDow(DateTime d) {
  // DateTime.weekday: 1 = Monday, 7 = Sunday
  final dow = _giorniBrevi[d.weekday - 1];
  return '$dow ${d.day} ${_mesiBrevi[d.month - 1]}';
}

/// "08:42"
String formatTimeIt(DateTime d) {
  final hh = d.hour.toString().padLeft(2, '0');
  final mm = d.minute.toString().padLeft(2, '0');
  return '$hh:$mm';
}

/// "1h 23m" o "23m 45s"
String formatDuration(Duration d) {
  if (d.inHours > 0) {
    return '${d.inHours}h ${d.inMinutes.remainder(60)}m';
  }
  if (d.inMinutes > 0) {
    return '${d.inMinutes}m ${d.inSeconds.remainder(60)}s';
  }
  return '${d.inSeconds}s';
}

/// "01:23:45" / "23:45" (formato cronometro)
String formatStopwatch(Duration d) {
  final hh = d.inHours;
  final mm = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final ss = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (hh > 0) {
    return '${hh.toString().padLeft(2, '0')}:$mm:$ss';
  }
  return '$mm:$ss';
}
