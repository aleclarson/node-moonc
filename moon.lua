local moon = require('moonscript.base')

while true do
  local len = tonumber(io.read('*l'))
  if len then
    local input = io.read(len)
    local lua, err = moon.to_lua(input)
    if lua then io.write(#lua, '\0', lua)
    else io.write(#err, '\1', err) end
    io.flush()
  end
end
