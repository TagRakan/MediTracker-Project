package com.MTA.V01.services.controllers;

import com.MTA.V01.models.FamilyRelationships;
import com.MTA.V01.models.User;
import com.MTA.V01.models.enumerations.ERelationshipType;
import com.MTA.V01.payload.response.FamilyNameAndAilments;
import com.MTA.V01.repositories.DoseRepository;
import com.MTA.V01.repositories.FamilyRelationshipsRepository;
import com.MTA.V01.repositories.UserRepository;
import com.MTA.V01.repositories.enumRepos.RelationshipTypeRepository;
import com.MTA.V01.services.general.GeneralServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import com.MTA.V01.repositories.enumRepos.RoleRepository;
import com.MTA.V01.models.enumerations.ERole;


import java.util.List;
import java.util.Set;

@Service
public class UserServices {

    @Autowired
    UserRepository userRepository;
    @Autowired
    GeneralServices generalServices;
    @Autowired
    DoseRepository doseRepository;
    @Autowired
    RelationshipTypeRepository relationshipTypeRepository;
    @Autowired
    FamilyRelationshipsRepository familyRelationshipsRepository;
    @Autowired
    RoleRepository roleRepository;
    //family side
    public ResponseEntity<?> addUserToFamily(String username, String familyCode, String relationship){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" doesn't exist");
        }
        User self = generalServices.getSelf();
        User targetUser = userRepository.findByUsername(username.toLowerCase()).get();

        if (familyRelationshipsRepository.existsByUserAndRelatedUser(self,targetUser)){
            return ResponseEntity.badRequest().body("user already is in family");
        }
        if (!generalServices.getFamilyCode(targetUser).equals(familyCode)){
            return ResponseEntity.badRequest().body("given code and user family code doesn't match");
        }


        FamilyRelationships familyRelationship = new FamilyRelationships(
                self,
                targetUser,
                relationshipTypeRepository.findByName(ERelationshipType.valueOf(relationship)));

        FamilyRelationships inverseFamilyRelationship = new FamilyRelationships(
                targetUser,
                self,
                relationshipTypeRepository.findByName(generalServices.inverseOfRelationshipType(ERelationshipType.valueOf(relationship))));


        familyRelationshipsRepository.save(familyRelationship);
        familyRelationshipsRepository.save(inverseFamilyRelationship);
        return ResponseEntity.ok("successfully added user to family");
    }

    public ResponseEntity<?> removeUserFromFamily(String username){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }
        User self = generalServices.getSelf();
        User target = userRepository.findByUsername(username.toLowerCase()).get();
        if (!familyRelationshipsRepository.existsByUserAndRelatedUser(self,target)){
            return ResponseEntity.badRequest().body("relationship not found");
        }

        familyRelationshipsRepository.deleteByUserAndRelatedUser(self,target);
        familyRelationshipsRepository.deleteByUserAndRelatedUser(target,self);

        return ResponseEntity.ok("deleted family");

    }

    public ResponseEntity<?> checkFamilyDoses(String username){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }

        User user = generalServices.getSelf();
        User target = userRepository.findByUsername(username.toLowerCase()).get();

        if (!familyRelationshipsRepository.existsByUserAndRelatedUser(user,target)){
            return ResponseEntity.badRequest().body("not authorized to view this information");
        }
        return ResponseEntity.ok(target.getDoses());

    }

    public ResponseEntity<?> checkFamilyPastDoses(String username){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }
        User self = generalServices.getSelf();
        User target = userRepository.findByUsername(username.toLowerCase()).get();

        if (!familyRelationshipsRepository.existsByUserAndRelatedUser(self,target)){
            return ResponseEntity.badRequest().body("not authorized to view this information");
        }
        return ResponseEntity.ok(target.getPastDoses());
    }

    public ResponseEntity<?> checkFamily(){
        if (generalServices.getSelf().getFamily().isEmpty()){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(generalServices.getSelf().getFamily());
    }

    public ResponseEntity<?> refreshFamilyCode(){
        return ResponseEntity.ok(generalServices.refreshFamilyCode());
    }

    public ResponseEntity<?> getFamilyCode(){
        return ResponseEntity.ok(generalServices.getFamilyCode(generalServices.getSelf()));
    }

    public ResponseEntity<?> checkDoctors() {
        Set<User> doctors = generalServices.getSelf().getDoctors();
        if (doctors.isEmpty()) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(doctors);
    }

    public ResponseEntity<?> addUserToDoctors(String username, String doctorCode){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }
        User self = generalServices.getSelf();
        User target = userRepository.findByUsername(username.toLowerCase()).get();

        if (userRepository.existsByIdAndPatientsContaining(target.getId(),self)){
            return ResponseEntity.badRequest().body("user is already in patient/doctor");
        }
        if (!generalServices.getPatientDoctorCode(target).equals(doctorCode)){
            return ResponseEntity.badRequest().body("doctor code is incorrect");
        }
        target.getPatients().add(self);
        userRepository.save(target);
        return ResponseEntity.ok("successfully added user to doctors");
    }

    //Doctor side
    public ResponseEntity<?> addUserToPatients(String username, String patientCode){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" doesn't exist");
        }

        User self = generalServices.getSelf();
        User target = userRepository.findByUsername(username.toLowerCase()).get();

        if (userRepository.existsByIdAndPatientsContaining(self.getId(),target)){
            return ResponseEntity.badRequest().body("user already is in patients/doctors");
        }
        if (!generalServices.getPatientDoctorCode(target).equals(patientCode)){
            return ResponseEntity.badRequest().body("given code and user patient/doctor code doesn't match");
        }
        self.getPatients().add(target);
        userRepository.save(self);
        return ResponseEntity.ok("successfully added user to patients");
    }

    public ResponseEntity<?> removeUserFromPatients(String username){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }
        User self = generalServices.getSelf();
        User patient = userRepository.findByUsername(username.toLowerCase()).get();

        self.getPatients().remove(patient);
        patient.getDoctors().remove(self);

        userRepository.save(self);
        userRepository.save(patient);
        return ResponseEntity.ok().build();
    }

    public ResponseEntity<?> checkPatientDoses(String username){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }

        User self = generalServices.getSelf();
        User target = userRepository.findByUsername(username.toLowerCase()).get();

        if (!userRepository.existsByIdAndPatientsContaining(self.getId(),target)){
            return ResponseEntity.badRequest().body("not authorized to view this data");
        }

        return ResponseEntity.ok(target.getDoses());
    }

    public ResponseEntity<?> checkPatientActiveDoses(String username){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }
        User self = generalServices.getSelf();
        User target = userRepository.findByUsername(username.toLowerCase()).get();

        if (!userRepository.existsByIdAndPatientsContaining(self.getId(),target)){
            return ResponseEntity.badRequest().body("not authorized to view this data");
        }

        return ResponseEntity.ok(doseRepository.findByIsActiveTrueAndUser(target));
    }

    public ResponseEntity<?> checkPatients() {
        Set<User> patients = generalServices.getSelf().getPatients();
        if (patients.isEmpty()) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(patients);
    }

    public ResponseEntity<?> checkPatientFamilyAilments(String username){
        if (!userRepository.existsByUsername(username.toLowerCase())){
            return ResponseEntity.badRequest().body("user with username "+username+" does not exist");
        }
        User target = userRepository.findByUsername(username.toLowerCase()).get();

        if (!userRepository.existsByIdAndPatientsContaining(generalServices.getSelf().getId(),target)){
            return ResponseEntity.badRequest().body("not authorized to view this data");
        }


        List<FamilyNameAndAilments> familyNameAndAilmentsList = target.getFamily().stream()
                .map(relationship -> new FamilyNameAndAilments(
                relationship.getRelatedUser().getName(),
                relationship.getRelatedUser().getAilmentList()
        )).toList();

        if (familyNameAndAilmentsList.isEmpty()){
            return ResponseEntity.noContent().build();
        }


        return ResponseEntity.ok(familyNameAndAilmentsList);
    }

    public ResponseEntity<?> refreshPatientCode(){
        return ResponseEntity.ok(generalServices.refreshPatientCode());
    }

    public ResponseEntity<?> getPatientCode(){
        return ResponseEntity.ok(generalServices.getPatientDoctorCode(generalServices.getSelf()));
    }

    public ResponseEntity<?> upgradeUser(Long userId){
      if (!userRepository.existsById(userId)) {
        return ResponseEntity.badRequest().body("user with the given id doesn't exist");
      }
      User user = generalServices.getUser(userId);

      if (user.getRoles().contains(roleRepository.findByName(ERole.ROLE_ADMIN).get())){
          return ResponseEntity.badRequest().body("user already at the highest privilege level");
      }

      if (user.getRoles().contains(roleRepository.findByName(ERole.ROLE_MODERATOR).get())) {
        user.getRoles().add(roleRepository.findByName(ERole.ROLE_ADMIN).get());
          userRepository.save(user);
          return ResponseEntity.ok("upgraded user to admin");
      }

      user.getRoles().add(roleRepository.findByName(ERole.ROLE_MODERATOR).get());
      userRepository.save(user);
      return ResponseEntity.ok("successfully upgraded user to moderator");
    }

    public ResponseEntity<?> downgradeUser(Long userId){
        if(!userRepository.existsById(userId)){
            return ResponseEntity.badRequest().body("user with user id "+userId+" does not exist");
        }
        User user = userRepository.findById(userId).get();
        User self = generalServices.getSelf();

        if (self.getId().equals(user.getId())){
            return ResponseEntity.badRequest().body("You are not allowed to demote yourself");
        }

        if (user.getRoles().contains(roleRepository.findByName(ERole.ROLE_ADMIN).get())){
            user.getRoles().remove(roleRepository.findByName(ERole.ROLE_ADMIN).get());
            userRepository.save(user);
            return ResponseEntity.ok("removed the admin role from user");
        }
        if (user.getRoles().contains(roleRepository.findByName(ERole.ROLE_MODERATOR).get())){
            user.getRoles().remove(roleRepository.findByName(ERole.ROLE_MODERATOR).get());
            userRepository.save(user);
            return ResponseEntity.ok("removed moderator role from user");
        }
        return ResponseEntity.badRequest().body("user at the lowest possible privilege");
    }

}
