# Walking π

Une marche sur un quadrillage guidée par les chiffres de **π en base 3**.

**▶ Démo : https://vincentbounce.github.io/Walking-Pi/**

π₃ = 10.0102110122220102110021111102212222201112012121212001…

On part de l'origine, orienté vers le haut, puis on lit chaque chiffre :

| Chiffre | Mouvement                          |
|:-------:|------------------------------------|
| `0`     | tourner à **gauche** puis avancer d'une case |
| `1`     | avancer tout **droit** d'une case  |
| `2`     | tourner à **droite** puis avancer d'une case |

## Lancer

Aucune dépendance ni build : ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
python3 -m http.server 8000
```

Le projet fonctionne tel quel avec **GitHub Pages** (Settings → Pages → branche `main`, dossier `/`).

## Fonctionnalités

- Calcul exact des chiffres de π en base 3 dans le navigateur (formule de Machin avec `BigInt`, dans un Web Worker) — jusqu'à 1 000 000 de chiffres
- Animation réglable (de quelques pas à 600 000 pas par seconde), pas à pas, aller à la fin
- Zoom à la molette, déplacement à la souris, cadrage automatique
- Couleurs : dégradé selon l'ordre, par chiffre, ou monochrome
- Statistiques : position, distance à l'origine, distance max, cases distinctes visitées, répartition des chiffres 0/1/2
- Option pour inclure la partie entière « 10 »

Raccourcis : `Espace` lecture/pause · `→` un pas · `R` recommencer · `E` fin · `F` recentrer

## Fichiers

- `index.html` — la page
- `style.css` — le style
- `main.js` — calcul de π, construction de la marche et rendu canvas
