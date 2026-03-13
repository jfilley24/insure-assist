# InsureAssist Git & Deployment Workflow

This document outlines the standard operating procedure for checking in code, running tests, and deploying the InsureAssist application.

## 1. The Branch Structure
Our repository uses a standard **Environment Branching Strategy** with three levels of branches:

* **Feature Branches** (`feature/your-feature-name`): These are your personal sandboxes. This is where you write code, break things, and experiment. Code here does not affect anyone else.
* **Development Branch** (`development`): This is the shared staging environment. All developers merge their finished features here. Code merged here **automatically deploys** to the developer testing servers.
* **Production Branch** (`production`): This is the live environment your customers see. Code is only merged here when it is heavily tested and ready for the real world. Code merged here **automatically deploys** to the live production servers.

## 2. The Golden Rule: No Direct Commits to 'development' or 'production'
To prevent broken code from taking down the live application or blocking other developers, **you cannot push code directly to `development` or `production`**.

Instead, you follow the **Pull Request (PR) Workflow**:

### Step 1: Create a Feature Branch
Locally on your computer, create a new branch for the specific task you are working on:
```bash
git checkout -b feature/pdf-checkbox-fix
```

### Step 2: Write Code and Push
Make your changes, commit them, and push your sandbox branch to GitHub:
```bash
git add .
git commit -m "Fix PDF checkbox mapping values"
git push origin feature/pdf-checkbox-fix
```

### Step 3: Open a Pull Request (The Gatekeeper)
Go to GitHub.com and open a **Pull Request** asking to merge `feature/pdf-checkbox-fix` into `development`.

When you open this PR, **GitHub Actions automatically intercepts it and runs our CI Checks (like the PDF Regression Tests).**
* ❌ If the tests fail, GitHub disables the "Merge" button. You must fix the code on your branch and push again.
* ✅ If the tests pass, the "Merge" button turns green.

### Step 4: Merge
Click "Merge Pull Request" on GitHub. Your code is now safely integrated into `development`.

---

## 3. How Deployments Work (Monorepo Architecture)

This repository is a **Monorepo**, meaning it contains multiple independent projects (`broker-portal`, `acord`, `front-desk-telephony`). 

They are deployed completely independently using GitHub Actions **Path Filters**. A deployment pipeline will *only* run if a file inside its specific folder was changed.

### The Receptionist Telephony Agent
If a developer merges code into `development` and edited files inside the `front-desk-telephony/` folder:
* GitHub triggers the `deploy-receptionist.yml` action.
* It builds the Docker container and deploys to **Google Cloud Run** (`receptionist-dev`).
* *Note: Editing the Broker Portal will **not** trigger this deployment.*

### The Broker Portal & Acord API (Deployed Together)
If a developer merges code into `development` and edited files inside `broker-portal/` or `acord/`:
* The internal CI/CD checks (like PDF Regression Tests) will trigger.
* *(Once a deployment pipeline is added for the Broker Portal, it will deploy independently to Vercel or Cloud Run here without affecting the Receptionist).*

**CRITICAL RULE:** The `broker-portal` (Frontend) and `acord` (Backend) are two halves of the *exact same application*. They must always be deployed **synchronously**. 
* Do **not** attempt to split their deployments or deploy the Python backend to production without deploying the Next.js frontend at the exact same time.
* If their schema contracts fall out of sync, the live website will crash.
* Both folders must share a single `paths` trigger in their GitHub Actions deployment file.

## 4. Summary Checklist for a Code Change
1. `git checkout development`
2. `git pull`
3. `git checkout -b feature/my-cool-update`
4. *(Write code)*
5. `git add .`
6. `git commit -m "Added a cool update"`
7. `git push origin feature/my-cool-update`
8. Go to GitHub and open PR into `development`.
9. Wait for automated PDF Regression Tests to pass.
10. Click Merge.
11. Wait 5 minutes for Google Cloud to automatically deploy the new version.
