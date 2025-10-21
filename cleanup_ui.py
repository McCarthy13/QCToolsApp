#!/usr/bin/env python3
"""
Clean up UI clutter from DailyPourScheduleScreen.tsx
"""

with open('src/screens/DailyPourScheduleScreen.tsx', 'r') as f:
    content = f.read()

# 1. Remove the sync button (the second Pressable in the action buttons)
# Find and replace the entire sync button section
import re

# Remove sync button from action buttons section
content = re.sub(
    r'\n\s+<Pressable\s+onPress={handleSyncWithEliPlan}.*?</Pressable>\s+</View>\s+</View>\s+\)\}',
    '\n              </Pressable>\n            </View>\n          )}',
    content,
    flags=re.DOTALL
)

# 2. Remove Configuration Status box
content = re.sub(
    r'\n\s+{/\* Configuration Status \*/}.*?</View>\s+\)\}',
    '',
    content,
    flags=re.DOTALL
)

# 3. Remove Last Sync Info box  
content = re.sub(
    r'\n\s+{/\* Last Sync Info \*/}.*?</View>\s+\)\}',
    '',
    content,
    flags=re.DOTALL
)

# 4. Remove Debug Info button
content = re.sub(
    r'\n\s+{/\* Debug Info - Shows all entries count \*/}.*?</Pressable>\s+\)\}',
    '',
    content,
    flags=re.DOTALL
)

# 5. Update main view header to have back button
# Find the header section in main view (after department selector)
old_header = r'(\s+{/\* Header \*/}\s+<View style={{ marginBottom: 24 }}>)\s+<Text style={{ fontSize: 28.*?Daily Pour Schedule.*?</Text>\s+<Text style={{ fontSize: 16.*?Manage concrete pours by department and form/bed.*?</Text>\s+(</View>)'

new_header = r'''\1
            <Pressable
              onPress={() => setViewingDepartment(null)}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={deptColors.accent} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: deptColors.accent, marginLeft: 8 }}>
                Change Department
              </Text>
            </Pressable>
            <Text style={{ fontSize: 28, fontWeight: "700", color: deptColors.color, marginBottom: 8 }}>
              {viewingDepartment}
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Manage concrete pours and schedules
            </Text>
          \2'''

content = re.sub(old_header, new_header, content, flags=re.DOTALL)

# 6. Update summary cards to use department data
content = re.sub(
    r'<Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Total Pours</Text>\s+<Text style={{ fontSize: 24, fontWeight: "700", color: "#111827" }}>\s+{todayEntries\.length}',
    '<Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Pours</Text>\n                <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827" }}>\n                  {departmentEntries.length}',
    content
)

content = re.sub(
    r'<Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Total Yards</Text>\s+<Text style={{ fontSize: 24, fontWeight: "700", color: "#111827" }}>\s+{totalYards\.toFixed\(1\)}',
    '<Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Yards</Text>\n                <Text style={{ fontSize: 24, fontWeight: "700", color: deptColors.accent }}>\n                  {departmentYards.toFixed(1)}',
    content
)

# 7. Simplify department loop to only show the viewing department
content = re.sub(
    r'{departments\.map\(\(dept\) => {',
    '{[viewingDepartment].map((dept) => {',
    content
)

# Write back
with open('src/screens/DailyPourScheduleScreen.tsx', 'w') as f:
    f.write(content)

print("✅ UI Cleanup Complete!")
print("   - Removed EliPlan sync button")
print("   - Removed Configuration Status box")
print("   - Removed Last Sync Info box")
print("   - Removed Debug Info button")
print("   - Updated header with back button")
print("   - Updated summary to use department data")
print("   - Simplified to show only selected department")
