function stopWheelChange(e: React.WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}
<input
  style={inputStyle}
  type="number"
  value={adults}
  onChange={(e) => setAdults(e.target.value)}
  onWheel={stopWheelChange}
/>
onChange={(e) => setAdults(e.target.value === "" ? "0" : e.target.value)}
onChange={(e) => setChildren(e.target.value === "" ? "0" : e.target.value)}
<input
  style={inputStyle}
  type="number"
  value={markup}
  onChange={(e) => setMarkup(e.target.value === "" ? "0" : e.target.value)}
  onWheel={stopWheelChange}
/>