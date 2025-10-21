#!/usr/bin/env python3
"""
Script to update DailyPourScheduleScreen.tsx with department selector
"""

# Read the file
with open('src/screens/DailyPourScheduleScreen.tsx', 'r') as f:
    lines = f.readlines()

# Find key line numbers
expanded_dept_line = None
today_entries_line = None
main_return_line = None

for i, line in enumerate(lines):
    if 'const [viewingDepartment' in line:
        expanded_dept_line = i
    if 'const todayEntries = getPourEntriesByDate' in line:
        today_entries_line = i
    if 'return (' in line and i > 200 and main_return_line is None:
        main_return_line = i

if expanded_dept_line is None or today_entries_line is None or main_return_line is None:
    print("Error: Could not find required lines")
    exit(1)

# 1. Replace viewingDepartment line to set default to initialDepartment
lines[expanded_dept_line] = '  const [viewingDepartment, setViewingDepartment] = useState<PourDepartment | null>(initialDepartment);\n'

# 2. Insert department selector before main return
department_selector = '''  // If no department selected, show department selector
  if (!viewingDepartment) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ padding: 24 }}>
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              Daily Pour Schedule
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Select a department to view and manage
            </Text>
          </View>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 12 }}>
              Schedule Date
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable onPress={() => changeDate(-1)} style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
                <Ionicons name="chevron-back" size={20} color="#111827" />
              </Pressable>
              <View style={{ flex: 1, marginHorizontal: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </Text>
                <Pressable onPress={() => setSelectedDate(Date.now())} style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 13, color: "#3B82F6", fontWeight: "500" }}>Today</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => changeDate(1)} style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
                <Ionicons name="chevron-forward" size={20} color="#111827" />
              </Pressable>
            </View>
          </View>

          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 16 }}>Select Department</Text>
          <View style={{ gap: 16 }}>
            {departments.map((dept) => {
              const deptEntries = todayEntries.filter(e => e.department === dept);
              const deptYards = deptEntries.reduce((sum, e) => sum + (e.concreteYards || 0), 0);
              const colors = getDepartmentColor(dept);
              const deptForms = getFormsByDepartment(dept);

              return (
                <Pressable
                  key={dept}
                  onPress={() => {
                    setViewingDepartment(dept);
                    setSelectedDepartment(dept);
                    setActiveDepartment(dept);
                  }}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, borderWidth: 2, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ fontSize: 20, fontWeight: "700", color: colors.color }}>{dept}</Text>
                    <Ionicons name="chevron-forward" size={24} color={colors.accent} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 20 }}>
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Forms</Text>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>{deptForms.length}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Pours Today</Text>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>{deptEntries.length}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Yards</Text>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: colors.accent }}>{deptYards.toFixed(1)}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show only selected department
  const departmentEntries = todayEntries.filter(e => e.department === viewingDepartment);
  const departmentYards = getTotalYardsForDate(selectedDate, viewingDepartment);
  const deptColors = getDepartmentColor(viewingDepartment);

'''

# Insert before main return
lines.insert(main_return_line, department_selector)

# 3. Replace all expandedDepartment with viewingDepartment
lines = [line.replace('expandedDepartment', 'viewingDepartment') for line in lines]
lines = [line.replace('setExpandedDepartment', 'setViewingDepartment') for line in lines]

# Write back
with open('src/screens/DailyPourScheduleScreen.tsx', 'w') as f:
    f.writelines(lines)

print("✅ Updated DailyPourScheduleScreen.tsx")
print("   - Added department selector screen")
print("   - Renamed expandedDepartment -> viewingDepartment")
print("   - Set default to show selector (null)")
