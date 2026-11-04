CJV INVENTORY PROJECT - FIXED PREVIEW VERSION

WHY THE WHITE SCREEN HAPPENED
The original app called createClient() with missing Supabase environment variables. Supabase requires a valid project URL and key, so the app could crash before React rendered anything.

WHAT WAS FIXED
- The app now detects whether Supabase credentials are configured.
- If credentials are present, it uses your real Supabase project.
- If credentials are missing, it starts in Local Preview Mode and stores demo inventory data in this browser's localStorage.
- You can preview the dashboard and test adding products, orders, ratings, stock movements, and scans without setting up Supabase.

HOW TO RUN
1. Extract this ZIP file.
2. Open the extracted cjv_code-main folder in Visual Studio Code.
3. Open Terminal > New Terminal.
4. Run: npm install
5. Run: npm run dev
6. Open the localhost URL printed in the terminal (usually http://localhost:5173).

OPTIONAL: CONNECT SUPABASE
1. Copy .env.example and rename the copy to .env.
2. Add your Supabase project URL and publishable/anon key.
3. Stop the dev server with Ctrl+C, then run npm run dev again.

IMPORTANT
Local Preview Mode saves data only in the browser where you run it. It does not sync to phones or other computers. For shared/mobile access and persistent cloud data, configure Supabase and run the supplied database migrations in your Supabase project.
