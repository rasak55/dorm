function reportsGet(p) {
  var year  = toInt(p.year) || new Date().getFullYear();
  var bills = getAll(SHEET.BILLS);
  var rooms = getAll(SHEET.ROOMS);

  // รายรับแต่ละเดือน
  var monthly = [];
  for (var m = 1; m <= 12; m++) {
    var monthBills = bills.filter(function(b) { return toInt(b.bill_month) === m && toInt(b.bill_year) === year; });
    var paidBills  = monthBills.filter(function(b) { return b.status === 'paid'; });
    var income     = paidBills.reduce(function(s, b) { return s + toNum(b.total_amount); }, 0);
    monthly.push({
      month:         m,
      income:        income,
      paid_count:    paidBills.length,
      pending_count: monthBills.filter(function(b) { return b.status === 'pending'; }).length
    });
  }

  // รวมทั้งปี
  var yearBills = bills.filter(function(b) { return toInt(b.bill_year) === year && b.status === 'paid'; });
  var yearTotal = yearBills.reduce(function(s, b) { return s + toNum(b.total_amount); }, 0);

  // breakdown
  var breakdown = {
    rent:     yearBills.reduce(function(s, b) { return s + toNum(b.rent_amount); }, 0),
    electric: yearBills.reduce(function(s, b) { return s + toNum(b.electric_amount); }, 0),
    water:    yearBills.reduce(function(s, b) { return s + toNum(b.water_amount); }, 0),
    other:    yearBills.reduce(function(s, b) { return s + toNum(b.other_amount); }, 0)
  };

  // อัตราการเช่า
  var totalRooms    = rooms.length;
  var occupiedRooms = rooms.filter(function(r) { return r.status === 'occupied'; }).length;
  var occupancyRate = totalRooms > 0 ? Math.round(occupiedRooms / totalRooms * 1000) / 10 : 0;

  return respond({
    year:           year,
    monthly:        monthly,
    year_total:     yearTotal,
    breakdown:      breakdown,
    occupancy_rate: occupancyRate,
    total_rooms:    totalRooms,
    occupied_rooms: occupiedRooms
  });
}
