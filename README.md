# CATNAT-DZ : Plateforme d'Analyse des Risques Sismiques en Algérie

## Description
CATNAT-DZ est une solution complète de gestion et d'analyse des risques de catastrophes naturelles (séismes) pour le marché algérien. Elle intègre les normes **RPA 99/2003**, une modélisation stochastique **Monte Carlo** pour l'estimation des pertes, et un moteur d'**Intelligence Artificielle (CatBoost)** pour l'évaluation de la vulnérabilité des portefeuilles d'assurance.

Le projet est divisé en deux parties : un **Back-end** puissant sous FastAPI et un **Front-end** moderne sous React/Tailwind.

---

## 🛠️ Installation et Configuration

### 1. Prérequis
- **Python 3.9+**
- **Node.js 18+**
- **pip** (Gestionnaire de paquets Python)
- **npm** (Gestionnaire de paquets Node)

### 2. Installation du Back-end
```bash
cd backend
# Création d'un environnement virtuel (recommandé)
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installation des dépendances
pip install fastapi uvicorn pandas numpy catboost pydantic
```

### 3. Installation du Front-end
```bash
cd front_ingdev
npm install
```

---

## 🚀 Démarrage des Services

### Lancer le Serveur Back-end (API)
```bash
cd backend
python main.py
```
Le serveur sera disponible sur : `http://localhost:8000`
La documentation interactive (Swagger) est disponible sur : `http://localhost:8000/docs`

### Lancer l'Application Front-end (UI)
```bash
cd front_ingdev
npm run dev
```
L'application sera disponible sur : `http://localhost:5173`

---

## 📡 API Endpoints (Back-end)

L'API traite les données de construction et de localisation pour fournir des analyses précises.

### 1. `POST /analyze_risk` (Principal)
Exécute une analyse intégrale incluant :
- **Validation RPA 99/2003** : Vérifie la conformité structurelle (nombre d'étages, hauteur, armature, ouvertures).
- **Prédiction IA** : Calcule un indice de risque basé sur le modèle CatBoost.
- **Simulation Monte Carlo** : Estime les pertes probables (Expected Loss, PML 95%).
- **Impact Portefeuille** : Vérifie si la nouvelle police crée une sur-concentration dans la Wilaya.

### 2. `POST /predict_ai`
Retourne uniquement l'indice de risque calculé par l'IA.

### 3. `POST /simulate_monte_carlo`
Exécute 10 000 itérations stochastiques pour estimer la distribution des pertes financières.

---

## 🖥️ Organisation de l'Interface (Front-end)

L'interface est conçue comme un tableau de bord professionnel organisé via une barre latérale :

### 1. Tableau de Bord (Accueil)
- Statistiques globales du capital assuré en Algérie.
- Graphiques de répartition du capital par zone sismique (Zone 0 à Zone III).
- Tableau détaillé des cumuls par Wilaya avec alertes de concentration.

### 2. Carte Sismique Interactive
- Visualisation géospatiale des communes algériennes.
- Deux modes de vue : **Risque Sismique (RPA)** et **Indice d'Exposition (Capital)**.
- Moteur de recherche pour zoomer sur une commune spécifique et voir son profil de risque.

### 3. Évaluation des Risques (Prédiction)
- Formulaire technique détaillé (Type de bâtiment, spécifications structurelles, matériaux).
- Génération d'un rapport de conformité RPA instantané.
- Décision de souscription assistée par IA (Accepté / Conditionnel / Refusé).

### 4. Moteur de Pertes (Simulation)
- Simulateur Monte Carlo permettant de tester différents scénarios de capital.
- Affichage de la **Perte Moyenne Attendue** et du scénario catastrophe (**PML 95%**).

---

## 🗂️ Structure du Projet
- `/backend` : Code source Python, modèle IA (.cbm) et serveurs API.
- `/front_ingdev` : Application React, composants Tailwind et fichiers sources.
- `/backend/data` ou racine : Données CSV (Wilayas/Communes) et GeoJSON pour la cartographie.

---
*Ce projet est destiné à un usage professionnel pour les ingénieurs risques et souscripteurs d'assurance.*
