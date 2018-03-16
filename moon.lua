local moon = require('moonscript.base')
while true do
  -- The length and payload are separated with a space.
  local len, sep = io.read('*n', 1)
  local lua, val = moon.to_lua(io.read(len))
  if lua == nil then
    io.stderr:write(val)
  else
    io.write(lua .. '\r\n[' .. table.concat(val, ',') .. ']')
  end
  io.flush()
end
