import pandas as pd

# Define the columns for the ingredient template
columns = [
    "국문 전성분",
    "영문 전성분",
    "함량(%, ppm, ppb)",
    "INCI명",
    "알러젠 표시",
    "배합 한도 성분 분류"
]

# Create an empty DataFrame with these columns
df = pd.DataFrame(columns=columns)

# Write to Excel
excel_path = "e:/AI/internal-management-system/frontend/public/Ingredient_Template.xlsx"
df.to_excel(excel_path, index=False)

print(f"Excel template generated successfully at: {excel_path}")
