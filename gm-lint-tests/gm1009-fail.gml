// Find all *.doc files that are readonly archives
var _attribs = fa_readonly + fa_archive; // Warn!
var _filename = file_find_first("/User Content/*.doc", _attribs);

// Go to the next room
room_goto(room + 1); // Warn! 