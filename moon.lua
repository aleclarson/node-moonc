local moon = require('moonscript.base')

local SEP = '\n{++}\n'
local EOF = '\n{--}\n'

while true do
  local len = tonumber(io.read('*l'))
  if len then
    local input = io.read(len)
    local lua, val = moon.to_lua(input)
    if lua then
      io.write(lua .. EOF)
    else
      -- Signal an error.
      io.write(SEP .. val .. EOF)
    end
  end
  io.flush()
end
