package com.MTA.V01.Config;

import com.MTA.V01.repositories.UserRepository;
import com.MTA.V01.repositories.enumRepos.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.MTA.V01.models.enumerations.*;
import com.MTA.V01.models.enumerationClasses.*;

@Component
public class EnumSeeder implements CommandLineRunner {

    @Autowired
    AilmentStatusRepository ailmentStatusRepository;
    @Autowired
    DoseStatusRepository doseStatusRepository;
    @Autowired
    EffectsRepository effectsRepository;
    @Autowired
    IngestionMethodRepository ingestionMethodRepository;
    @Autowired
    LogTypeRepository logTypeRepository;
    @Autowired
    RestrictionRepository restrictionRepository;
    @Autowired
    RoleRepository roleRepository;
    @Autowired
    SideEffectRepository sideEffectRepository;
    @Autowired
    RelationshipTypeRepository relationshipTypeRepository;

    @Override
    public void run(String... args) throws Exception {


            for (EAilmentStatus Estatus : EAilmentStatus.values()) {
                if (!ailmentStatusRepository.existsByName(Estatus)) {
                    AilmentStatus status = new AilmentStatus();
                    status.setName(Estatus);
                    ailmentStatusRepository.save(status);
                }
            }

            for (EDoseStatus EDose : EDoseStatus.values()) {
                if (!doseStatusRepository.existsByName(EDose)) {
                    DoseStatus doseStatus = new DoseStatus();
                    doseStatus.setName(EDose);
                    doseStatusRepository.save(doseStatus);
                }
            }

            for (EEffects eEffects : EEffects.values()) {
                if (!effectsRepository.existsByName(eEffects)) {
                    Effects effects = new Effects();
                    effects.setName(eEffects);
                    effectsRepository.save(effects);
                }
            }

            for (EIngestionMethod eIngestionMethod : EIngestionMethod.values()) {
                if (!ingestionMethodRepository.existsByName(eIngestionMethod)) {
                    IngestionMethod ingestionMethod = new IngestionMethod();
                    ingestionMethod.setName(eIngestionMethod);
                    ingestionMethodRepository.save(ingestionMethod);
                }
            }

            for (ELogType eLogType : ELogType.values()) {
                if (!logTypeRepository.existsByName(eLogType)) {
                    LogType logType = new LogType();
                    logType.setName(eLogType);
                    logTypeRepository.save(logType);
                }
            }

            for (ERestrictions eRestrictions : ERestrictions.values()) {
                if (!restrictionRepository.existsByName(eRestrictions)) {
                    Restriction restriction = new Restriction();
                    restriction.setName(eRestrictions);
                    restrictionRepository.save(restriction);
                }
            }

            for (ERole eRole : ERole.values()) {
                if (!roleRepository.existsByName(eRole)) {
                    Role role = new Role();
                    role.setName(eRole);
                    roleRepository.save(role);
                }
            }

            for (ESideEffects eSideEffects : ESideEffects.values()) {
                if (!sideEffectRepository.existsByName(eSideEffects)) {
                    SideEffect sideEffect = new SideEffect();
                    sideEffect.setName(eSideEffects);
                    sideEffectRepository.save(sideEffect);
                }
            }

            for (ERelationshipType eRelationshipType:ERelationshipType.values()){
                if (!relationshipTypeRepository.existsByName(eRelationshipType)){
                    RelationshipType relationshipType = new RelationshipType();
                    relationshipType.setName(eRelationshipType);
                    relationshipTypeRepository.save(relationshipType);
                }
            }


    }
}
