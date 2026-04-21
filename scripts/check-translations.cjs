#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Langues disponibles
const languages = ['en', 'fr', 'de', 'es', 'pt', 'ru', 'ja', 'zh', 'ar'];
const namespaces = ['common', 'connection', 'fileBrowser', 'help', 'transfer'];

// Fonction pour extraire toutes les clés d'un objet de manière récursive
function extractKeys(obj, prefix = '') {
    const keys = [];
    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys.push(...extractKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

// Fonction pour charger un fichier de traduction
function loadTranslation(lang, namespace) {
    const filePath = path.join(__dirname, 'src', 'locales', lang, `${namespace}.json`);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Erreur lors de la lecture de ${filePath}: ${error.message}`);
        return null;
    }
}

// Fonction principale
function checkTranslations() {
    console.log('🔍 Vérification des traductions...\n');

    const results = {
        missingKeys: {},
        extraKeys: {},
        summary: {}
    };

    // Pour chaque namespace
    for (const namespace of namespaces) {
        console.log(`📁 Namespace: ${namespace}`);

        // Charger la référence (anglais)
        const referenceData = loadTranslation('en', namespace);
        if (!referenceData) {
            console.log(`  ⚠️  Impossible de charger la référence anglaise\n`);
            continue;
        }

        const referenceKeys = extractKeys(referenceData).sort();
        console.log(`  📊 Clés de référence (en): ${referenceKeys.length}`);

        // Vérifier chaque langue
        for (const lang of languages) {
            if (lang === 'en') continue; // Skip reference language

            const translationData = loadTranslation(lang, namespace);
            if (!translationData) {
                results.missingKeys[`${lang}/${namespace}`] = referenceKeys;
                results.summary[lang] = (results.summary[lang] || 0) + referenceKeys.length;
                continue;
            }

            const translationKeys = extractKeys(translationData).sort();

            // Trouver les clés manquantes
            const missing = referenceKeys.filter(key => !translationKeys.includes(key));
            if (missing.length > 0) {
                results.missingKeys[`${lang}/${namespace}`] = missing;
                results.summary[lang] = (results.summary[lang] || 0) + missing.length;
            }

            // Trouver les clés en trop
            const extra = translationKeys.filter(key => !referenceKeys.includes(key));
            if (extra.length > 0) {
                results.extraKeys[`${lang}/${namespace}`] = extra;
            }
        }
        console.log('');
    }

    // Afficher le résumé
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ DES TRADUCTIONS MANQUANTES');
    console.log('═══════════════════════════════════════════════════════\n');

    let totalMissing = 0;
    const sortedLangs = Object.keys(results.summary).sort();

    if (sortedLangs.length === 0) {
        console.log('✅ Toutes les traductions sont complètes!\n');
    } else {
        for (const lang of sortedLangs) {
            const count = results.summary[lang];
            totalMissing += count;
            console.log(`  ${lang}: ${count} clé(s) manquante(s)`);
        }
        console.log(`\n  TOTAL: ${totalMissing} clé(s) manquante(s)\n`);
    }

    // Afficher les détails des clés manquantes
    if (Object.keys(results.missingKeys).length > 0) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📋 DÉTAILS DES CLÉS MANQUANTES');
        console.log('═══════════════════════════════════════════════════════\n');

        for (const [file, keys] of Object.entries(results.missingKeys)) {
            console.log(`\n❌ ${file}:`);
            keys.forEach(key => console.log(`   - ${key}`));
        }
        console.log('');
    }

    // Afficher les clés en trop
    if (Object.keys(results.extraKeys).length > 0) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️  CLÉS EN TROP (non présentes dans la référence)');
        console.log('═══════════════════════════════════════════════════════\n');

        for (const [file, keys] of Object.entries(results.extraKeys)) {
            console.log(`\n⚠️  ${file}:`);
            keys.forEach(key => console.log(`   - ${key}`));
        }
        console.log('');
    }

    // Code de sortie
    if (totalMissing > 0) {
        console.log('❌ Des traductions sont manquantes!\n');
        process.exit(1);
    } else {
        console.log('✅ Toutes les traductions sont complètes!\n');
        process.exit(0);
    }
}

// Exécuter la vérification
checkTranslations();

// Made with Bob
