local moon = require('moonscript.base')

local ERR = '\n{!!}\n'
local EOF = '\n{--}\n'

while true do
  local len = tonumber(io.read('*l'))
  if len then
    local input = io.read(len)
    local lua, err = moon.to_lua(input)
    if lua then
      io.write(lua)
      io.write(EOF)
    else
      io.write(ERR)
      io.write(err)
      io.write(EOF)
    end
    io.flush()
  end
end
