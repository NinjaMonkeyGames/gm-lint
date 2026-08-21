function check_number(val) {
    if (val > 10) {
        return true;
    } else {
        return false;
    }
    
    // This code is truly unreachable, correctly flagged:
    var extra = 5; 
}