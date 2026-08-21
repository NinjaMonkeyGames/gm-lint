var config_data = global.settings;

// Short-circuit evaluation
var sound_vol = config_data != noone && config_data.audio_volume;

// Ternary assignment
var active_sprite = (sprite_index != -1) ? sprite_index : spr_default;