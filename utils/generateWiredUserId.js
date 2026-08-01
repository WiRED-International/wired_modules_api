function generateWiredUserId(id) {
  return `WRD${100000 + id}`;
}

module.exports = generateWiredUserId;