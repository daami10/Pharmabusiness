CREATE TABLE trabajadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON trabajadores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE seguros_sociales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE,
  importe DECIMAL(10,2) DEFAULT 0,
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE seguros_sociales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON seguros_sociales FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE nominas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE CASCADE,
  trabajador_nombre TEXT DEFAULT '',
  fecha DATE,
  importe DECIMAL(10,2) DEFAULT 0,
  concepto TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON nominas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
