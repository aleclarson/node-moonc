local moon = require('moonscript.base')

local SEP = '\n{++}\n'
local EOF = '\n{--}\n'

while true do
  local len = tonumber(io.read('*l'))
  if len then
    local lua, val = moon.to_lua(io.read(len))
    if lua then
      if val[1] == nil then val = {} end
      io.write(lua .. SEP .. '[' .. table.concat(val, ',') .. ']' .. EOF)
    else
      -- Signal an error.
      io.write(SEP .. val .. EOF)
    end
  end
  io.flush()
end
