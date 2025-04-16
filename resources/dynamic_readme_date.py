'''
This script updates the README.md file with the current month and year.
It's automatically run every time a commit is made to the repository.
Thank you, Git Hook!
'''

from datetime import datetime

# filepath to README
readme_path = "README.md"

# get current month and year
current_date = datetime.now()
month_year = current_date.strftime("%B %Y")

# where date will be inserted
marker_start = "<!-- START_DATE -->"
marker_end = "<!-- END_DATE -->"

# read README
with open(readme_path, "r") as file:
    content = file.read()

# insert current month and year
if marker_start in content and marker_end in content:
    updated_content = (
        content.split(marker_start)[0]
        + f"{marker_start}{month_year}{marker_end}"
        + content.split(marker_end)[1]
    )
else:
    print("Markers not found in README.md. No changes made.")
    exit()

# write updated content back to README.md
with open(readme_path, "w") as file:
    file.write(updated_content)

print(f"Updated README.md with the current date: {month_year}")
